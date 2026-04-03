import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "テキストを入力してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
ユーザーが入力した改善情報（問題の内容、発生場所、影響、頻度、原因仮説、改善案の方向、期待効果など）を分析し、構造化された改善シートのドラフトを生成してください。

入力には以下の情報が含まれます：
【必須】問題の内容、発生場所、影響、頻度、原因仮説、改善案の方向、期待効果
【任意】関係部署、数値根拠

あなたの役割：
1. 入力情報を元に、簡潔で明確なタイトルを生成
2. 課題・原因・解決策・効果を構造化して整理（入力情報を補足・明確化）
3. 主管部門と関連部署を推定（ユーザー入力の関係部署も考慮）
4. カテゴリ・再現性・タグを適切に付与

重要：related_departments（関連部署）は、この改善が直接的・間接的に効果を及ぼす可能性がある全ての部署を推定して含めてください。ユーザーが明示した関係部署がある場合は必ず含めてください。`,
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
              description: "改善案を構造化データに変換する",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "改善案の簡潔なタイトル（20文字以内）" },
                  problem: { type: "string", description: "課題：現状の問題点を簡潔に記述（入力の問題の内容・影響を統合）" },
                  cause: { type: "string", description: "原因：問題が起きている根本的な原因（入力の原因仮説を深堀り）" },
                  solution: { type: "string", description: "解決策：具体的な改善内容（入力の改善案の方向を具体化）" },
                  effect: { type: "string", description: "効果：期待される改善効果（入力の期待効果を構造化）" },
                  department: { type: "string", description: "主管部門：最も関連する部門名（入力の発生場所から推定）" },
                  category: {
                    type: "string",
                    enum: ["業務効率化", "DX推進", "標準化", "可視化", "コスト削減", "品質向上", "その他"],
                  },
                  reproducibility: {
                    type: "string",
                    enum: ["高", "中", "低"],
                    description: "他部署でも活用できるかどうかの評価",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "関連するキーワードタグ（3〜5個）",
                  },
                  related_departments: {
                    type: "array",
                    items: { type: "string" },
                    description: "この改善が波及効果を持つ可能性のある関連部署の一覧（主管部門以外も含む）",
                  },
                },
                required: ["title", "problem", "cause", "solution", "effect", "department", "category", "reproducibility", "tags", "related_departments"],
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
    if (toolCall?.function?.arguments) {
      const structured = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ structured }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ structured: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "AIの応答を解析できませんでした", raw: content }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("structure-kaizen error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
