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

    // 金額点（0〜30点満点）：入力された推定年間収支影響額の絶対値で帯判定
    // 金額未入力時は null を返し、後でAIに本文から推定させる
    const amountScoreFromInput = (amount: number | null): { score: number; label: string } | null => {
      if (amount === null || !Number.isFinite(amount)) return null;
      const abs = Math.abs(amount);
      if (abs < 100_000)    return { score: 4,  label: "個人作業効率化レベル" };
      if (abs < 1_000_000)  return { score: 9,  label: "1チーム内小改善レベル" };
      if (abs < 10_000_000) return { score: 16, label: "1部署規模の業務改革レベル" };
      if (abs < 50_000_000) return { score: 23, label: "複数部署横断の業務改革レベル" };
      return                       { score: 28, label: "全社・事業戦略級レベル" };
    };
    const amountFromInput = amountScoreFromInput(estimatedImpact);

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
ユーザーが入力した改善情報を分析し、構造化された改善シートのドラフトを生成し、さらに評価方針に沿って「内容点」を採点してください。

【現在の評価方針（合計${totalWeight}点 → 内容点70点満点に正規化されます）】
${axisDescriptions}

あなたの役割：
1. 入力情報を元に、簡潔で明確なタイトルを生成
2. 課題・原因・解決策・効果を構造化して整理（評価方針の観点を踏まえて深掘り・具体化する）
3. 主管部門と関連部署を推定
4. カテゴリ・再現性・タグを付与
5. 上記の評価方針の各軸ごとに 0〜ウェイト点 で配点（per_axis_scores）
   - **金額の規模は内容採点に絶対に反映しないこと**（金額点は別枠で加算される）
   - 純粋に「課題・原因・解決策・効果・数値根拠の具体性」のみで採点する
   - 軸ごとの強弱（差）はそのまま残してよい（一様にしない）
6. 採点理由を score_reason に1〜2文で記述（内容観点のみ）
${amountFromInput === null
  ? `7. 金額が未入力のため、本文から年間収支影響額を推定し amount_score_estimate（0〜30）に格納
   - 〜10万円相当=4 / 10万〜100万=9 / 100万〜1000万=16 / 1000万〜5000万=23 / 5000万以上=28`
  : `7. 金額点は入力値から自動算出済（${amountFromInput.score}/30点：${amountFromInput.label}）。amount_score_estimate は null でよい。`}

【内容採点ルーブリック（厳守）】
- 0〜20%：抽象・曖昧（「効率化する」「改善する」のみ）
- 20〜40%：一部具体（対象業務は明確だが手段が曖昧）
- 40〜55%：具体的だが数値根拠なし
- 55〜75%：具体＋数値根拠あり（時間・件数・金額のいずれか）
- 75〜100%：具体＋数値根拠＋再現性・波及範囲まで言及

【入力された金額情報（参考のみ・採点には使わない）】
- 使用コスト（年間）: ${usageCost === null ? "未入力" : `${usageCost.toLocaleString("ja-JP")} 円`}
- 推定年間収支影響額: ${estimatedImpact === null ? "未入力" : `${estimatedImpact.toLocaleString("ja-JP")} 円`}

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
              description: "改善案を構造化データに変換し、内容観点で採点する",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "改善案の簡潔なタイトル（20文字以内）" },
                  problem: { type: "string" },
                  cause: { type: "string" },
                  solution: { type: "string" },
                  effect: { type: "string" },
                  department: { type: "string" },
                  category: {
                    type: "string",
                    enum: ["業務効率化", "DX推進", "標準化", "可視化", "コスト削減", "品質向上", "その他"],
                  },
                  reproducibility: { type: "string", enum: ["高", "中", "低"] },
                  tags: { type: "array", items: { type: "string" } },
                  related_departments: { type: "array", items: { type: "string" } },
                  per_axis_scores: {
                    type: "array",
                    description: "評価方針の各軸ごとの得点（0〜各軸のウェイト点）。内容観点のみで採点する。",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        score: { type: "number" },
                      },
                      required: ["key", "score"],
                    },
                  },
                  amount_score_estimate: {
                    type: ["number", "null"],
                    description: "金額未入力時のみ、本文から推定した金額点（0〜30）。金額入力済みなら null。",
                  },
                  score_reason: { type: "string", description: "内容観点での採点理由（1〜2文）" },
                },
                required: [
                  "title", "problem", "cause", "solution", "effect", "department",
                  "category", "reproducibility", "tags", "related_departments",
                  "per_axis_scores", "score_reason",
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

    // ── 内容点を 0〜70 にスケーリング ──
    let contentScore = 0;
    if (Array.isArray(structured.per_axis_scores) && totalWeight > 0) {
      const sum = structured.per_axis_scores.reduce(
        (s: number, x: any) => s + (Number(x.score) || 0), 0
      );
      contentScore = Math.max(0, Math.min(70, Math.round((sum / totalWeight) * 70)));
    }

    // ── 金額点（0〜30）──
    let amountScore = 0;
    if (amountFromInput) {
      amountScore = amountFromInput.score;
    } else if (typeof structured.amount_score_estimate === "number") {
      amountScore = Math.max(0, Math.min(30, Math.round(structured.amount_score_estimate)));
    }

    // ── 最終総合点（0〜100）──
    const finalScore = Math.max(0, Math.min(100, amountScore + contentScore));
    structured.impact_score = finalScore;

    // score_reason に内訳を補記
    structured.score_reason = `${structured.score_reason ?? ""}（金額点 ${amountScore}/30 + 内容点 ${contentScore}/70 = ${finalScore}点）`;

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
