import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text } = body;
    const usageCost: number | null = typeof body.usage_cost === "number" ? body.usage_cost : null;
    const estimatedImpact: number | null = typeof body.estimated_annual_impact === "number" ? body.estimated_annual_impact : null;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "テキストを入力してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 推定年間収支影響額（人が入力した絶対基準）→ スコア帯
    const bandFromAmount = (amount: number | null): { min: number; max: number; label: string } | null => {
      if (amount === null || !Number.isFinite(amount)) return null;
      const abs = Math.abs(amount);
      if (abs < 100_000)       return { min: 5,  max: 20,  label: "個人作業効率化レベル" };
      if (abs < 1_000_000)     return { min: 20, max: 40,  label: "1チーム内小改善レベル" };
      if (abs < 10_000_000)    return { min: 40, max: 65,  label: "1部署規模の業務改革レベル" };
      if (abs < 50_000_000)    return { min: 65, max: 85,  label: "複数部署横断の業務改革レベル" };
      return                          { min: 85, max: 100, label: "全社・事業戦略級レベル" };
    };
    const band = bandFromAmount(estimatedImpact);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ── 評価方針（eval_axes）をサーバ側で取得して、必ず最新を反映する ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: axesRows } = await supabase
      .from("eval_axes")
      .select("key, name, description, weight")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const axes = axesRows ?? [];
    const totalWeight = axes.reduce((s, a) => s + (a.weight ?? 0), 0) || 100;
    const axisDescriptions = axes.length
      ? axes.map((a, i) =>
          `${i + 1}. ${a.name}（key: ${a.key}）: ウェイト ${a.weight}点 / 合計${totalWeight}点\n   → ${a.description || "詳細なし"}`
        ).join("\n")
      : "（評価軸が未設定。一般的な観点で構造化のみを行ってください）";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          {
            role: "system",
            content: `あなたは企業の改善活動を支援するAIアシスタントです。
ユーザーが入力した改善情報を分析し、構造化された改善シートのドラフトを生成し、さらに評価方針に沿ってインパクトスコアを厳格に採点してください。

【現在の評価方針（合計${totalWeight}点）】
${axisDescriptions}

あなたの役割：
1. 入力情報を元に、簡潔で明確なタイトルを生成
2. 課題・原因・解決策・効果を構造化して整理（評価方針の観点を踏まえて深掘り・具体化する）
3. 主管部門と関連部署を推定
4. カテゴリ・再現性・タグを付与
5. 上記の評価方針の各軸ごとに 0〜ウェイト点 で配点し、その合計（0〜${totalWeight}）を impact_score として返す
   - 各軸の配点は per_axis_scores に { key, score } の配列で返す
   - impact_score は per_axis_scores の合計に一致させる（端数は四捨五入）
6. 採点理由を score_reason に1〜2文で記述

【採点方針 — 人が入力した金額を絶対基準にして厳格運用（必ず守ること）】

▼ 入力された金額情報（最優先・絶対基準）：
- 使用コスト（年間）: ${usageCost === null ? "未入力" : `${usageCost.toLocaleString("ja-JP")} 円`}
- 推定年間収支影響額: ${estimatedImpact === null ? "未入力" : `${estimatedImpact.toLocaleString("ja-JP")} 円`}
${band ? `→ この金額は「${band.label}」に該当。合計スコアは必ず ${band.min}〜${band.max} 点の範囲に収めること。` : "→ 金額未入力のため、本文から推定する。"}

▼ 金額レンジ → 合計スコア帯（推定年間収支影響額の絶対値で判定）：
  - 〜10万円未満       → 合計  5〜 20点（個人作業効率化）
  - 10万〜100万円未満  → 合計 20〜 40点（1チーム内小改善）
  - 100万〜1000万円未満→ 合計 40〜 65点（1部署規模の業務改革）
  - 1000万〜5000万円未満→ 合計 65〜 85点（複数部署横断の業務改革）
  - 5000万円以上       → 合計 85〜100点（全社・事業戦略級）

▼ 厳守ルール
- 金額が入力されている場合は、上記スコア帯を絶対基準として最優先する（本文の印象で帯から外れてはならない）。
- 数値根拠（効果額・件数・時間）の記述が薄くても、入力金額帯を最優先する。
- 「課題・原因・解決策・効果」のいずれかが曖昧・抽象なら、各軸内で-10〜-20%補正してよいが、合計の帯は超えない。
- 個人レベルの細かい改善（文房具・机周り・自分用ツール等）は、合計20点を超えないこと。
- 数千万円以上が入力されている改善は必ず80点以上。
- 80点超は「組織全体に波及する戦略級」、90点超は「経営インパクト級」。

重要：related_departments は直接的・間接的に効果を及ぼす可能性がある全ての部署を推定して含めてください。`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_kaizen",
              description: "改善案を構造化データに変換し、評価方針に沿って採点する",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "改善案の簡潔なタイトル（20文字以内）" },
                  problem: { type: "string", description: "課題：現状の問題点を簡潔に記述" },
                  cause: { type: "string", description: "原因：問題が起きている根本的な原因" },
                  solution: { type: "string", description: "解決策：具体的な改善内容" },
                  effect: { type: "string", description: "効果：期待される改善効果" },
                  department: { type: "string", description: "主管部門" },
                  category: {
                    type: "string",
                    enum: ["業務効率化", "DX推進", "標準化", "可視化", "コスト削減", "品質向上", "その他"],
                  },
                  reproducibility: {
                    type: "string",
                    enum: ["高", "中", "低"],
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "関連キーワードタグ（3〜5個）",
                  },
                  related_departments: {
                    type: "array",
                    items: { type: "string" },
                  },
                  per_axis_scores: {
                    type: "array",
                    description: "評価方針の各軸ごとの得点（0〜各軸のウェイト点）",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string", description: "評価軸のkey" },
                        score: { type: "number", description: "0〜該当軸のウェイト点" },
                      },
                      required: ["key", "score"],
                    },
                  },
                  impact_score: {
                    type: "number",
                    description: `合計インパクトスコア（0〜${totalWeight}）。per_axis_scoresの合計と一致させる。`,
                  },
                  score_reason: { type: "string", description: "採点理由（1〜2文）" },
                },
                required: [
                  "title", "problem", "cause", "solution", "effect", "department",
                  "category", "reproducibility", "tags", "related_departments",
                  "per_axis_scores", "impact_score", "score_reason",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_kaizen" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "リクエストが多すぎます。しばらくしてからお試しください。" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI利用枠が不足しています。管理者にお問い合わせください。" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let structured: any = null;

    if (toolCall?.function?.arguments) {
      structured = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          structured = JSON.parse(content);
        } catch {
          return new Response(JSON.stringify({ error: "AIの応答を解析できませんでした", raw: content }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!structured) throw new Error("No valid response from AI");

    // 念のためサーバ側でも合計スコアを再計算してクランプ（0〜100に正規化）
    if (Array.isArray(structured.per_axis_scores)) {
      const sum = structured.per_axis_scores.reduce(
        (s: number, x: any) => s + (Number(x.score) || 0), 0
      );
      // 表示は常に0〜100スケール（合計ウェイトが100の場合はそのまま）
      const normalized = totalWeight > 0 ? Math.round((sum / totalWeight) * 100) : 0;
      structured.impact_score = Math.max(0, Math.min(100, normalized));
    } else if (typeof structured.impact_score === "number") {
      structured.impact_score = Math.max(0, Math.min(100, Math.round(structured.impact_score)));
    }

    return new Response(JSON.stringify({ structured, axes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-kaizen error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
