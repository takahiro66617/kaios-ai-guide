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
    const { query, items } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "検索クエリを入力してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a compact summary of items for the AI
    const itemsSummary = items.map((item: any, idx: number) => 
      `[${idx}] "${item.title}" | 課題: ${item.problem} | 解決策: ${item.solution} | 効果: ${item.effect} | カテゴリ: ${item.category} | 部門: ${item.department} | タグ: ${(item.tags || []).join(",")}`
    ).join("\n");

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
            content: `あなたは企業の改善ナレッジベースの検索AIです。
ユーザーの検索クエリに対して、登録されている改善事例の類似度を評価してください。

意味的な類似性を重視してください：
- キーワードの完全一致だけでなく、概念的な関連性も考慮
- 同じ課題パターン（属人化、手作業、情報散在など）を認識
- 解決アプローチの類似性（自動化、標準化、可視化など）も評価
- ユーザーが漠然とした悩みを入力した場合でも、関連する事例を見つける

各事例について類似度スコア(0-100)と、なぜ類似しているかの理由を返してください。`,
          },
          {
            role: "user",
            content: `検索クエリ: "${query}"

改善事例一覧:
${itemsSummary}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rank_similar_cases",
              description: "改善事例の類似度ランキングを返す",
              parameters: {
                type: "object",
                properties: {
                  rankings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "事例のインデックス番号" },
                        similarity: { type: "number", description: "類似度スコア (0-100)" },
                        reason: { type: "string", description: "類似している理由（1-2文）" },
                      },
                      required: ["index", "similarity", "reason"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "検索結果の全体的なサマリー（1文）" },
                },
                required: ["rankings", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rank_similar_cases" } },
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
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "AIの応答を解析できませんでした" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("search-similar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
