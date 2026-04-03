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
ユーザーが入力した自由記述テキスト（現場の気づき、改善の取り組み、業務で変えたこと）を分析し、以下の構造化フォーマットに整理してください。

必ず以下のJSON形式で返してください。余分なテキストは不要です：
{
  "title": "改善案の簡潔なタイトル（20文字以内）",
  "problem": "課題：現状の問題点を簡潔に記述",
  "cause": "原因：問題が起きている根本的な原因",
  "solution": "解決策：実施した、または提案する具体的な改善内容",
  "effect": "効果：期待される（または実際の）改善効果",
  "department": "関連部門：最も関連する部門名",
  "category": "カテゴリ：業務効率化/DX推進/標準化/可視化/コスト削減/品質向上/その他 のいずれか",
  "reproducibility": "再現性：他部署でも活用できるかどうかの評価（高/中/低）",
  "tags": ["関連するキーワードタグを3〜5個"]
}`,
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
                  title: { type: "string", description: "改善案の簡潔なタイトル" },
                  problem: { type: "string", description: "課題：現状の問題点" },
                  cause: { type: "string", description: "原因：根本的な原因" },
                  solution: { type: "string", description: "解決策：具体的な改善内容" },
                  effect: { type: "string", description: "効果：期待される改善効果" },
                  department: { type: "string", description: "関連部門" },
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
                    description: "関連するキーワードタグ",
                  },
                },
                required: ["title", "problem", "cause", "solution", "effect", "department", "category", "reproducibility", "tags"],
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

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const structured = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ structured }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ structured: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "AIの応答を解析できませんでした", raw: content }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
