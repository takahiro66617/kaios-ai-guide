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
    const { speed, crossFunctional } = await req.json();

    if (typeof speed !== "number" || typeof crossFunctional !== "number") {
      return new Response(
        JSON.stringify({ error: "speed と crossFunctional は数値で指定してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all kaizen items
    const { data: items, error: fetchError } = await supabase
      .from("kaizen_items")
      .select("*");

    if (fetchError) throw new Error(`Failed to fetch items: ${fetchError.message}`);
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ message: "改善案が0件のため再計算不要です", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare item summaries for AI
    const itemSummaries = items.map(item => ({
      id: item.id,
      title: item.title,
      problem: item.problem,
      solution: item.solution,
      effect: item.effect,
      category: item.category,
      reproducibility: item.reproducibility,
      department: item.department,
      adoptedByCount: (item.adopted_by || []).length,
      status: item.status,
    }));

    // Call AI to evaluate scores based on current weights
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
            content: `あなたは企業の改善活動のインパクトを評価するAIです。

以下の評価方針に基づいて、各改善案のインパクトスコア（0〜100）を算出してください。

【評価方針】
- 迅速な実行（Speed）の重視度: ${speed}%
  → 高いほど、素早く実行できる改善や短いPDCAサイクルの提案を高評価
- 部門横断での有効性（Cross-functional）の重視度: ${crossFunctional}%
  → 高いほど、他部署への波及効果や再利用性のある改善を高評価

【スコア算出の考慮事項】
- 再現性が「高」→ 他部署展開しやすいので、crossFunctionalが高いとボーナス
- 採用部署数（adoptedByCount）が多い → crossFunctionalのウェイトに応じてボーナス
- ステータスが「完了」→ 実行力の証明としてspeedウェイトに応じてボーナス
- カテゴリや効果の記述内容からも総合的に判断

各改善案のIDとスコアをJSON配列で返してください。`,
          },
          {
            role: "user",
            content: JSON.stringify(itemSummaries),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_impact_scores",
              description: "各改善案のインパクトスコアを設定する",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "改善案のID" },
                        score: { type: "number", description: "インパクトスコア（0〜100）" },
                        reason: { type: "string", description: "スコアの根拠（1文）" },
                      },
                      required: ["id", "score"],
                    },
                  },
                },
                required: ["scores"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_impact_scores" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let scores: { id: string; score: number; reason?: string }[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      scores = parsed.scores || [];
    } else {
      // Fallback: parse content
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        scores = Array.isArray(parsed) ? parsed : parsed.scores || [];
      }
    }

    // Update each item's impact_score in DB
    let updated = 0;
    for (const s of scores) {
      const clampedScore = Math.max(0, Math.min(100, Math.round(s.score)));
      const { error } = await supabase
        .from("kaizen_items")
        .update({ impact_score: clampedScore })
        .eq("id", s.id);
      if (!error) updated++;
    }

    // Save eval settings
    const { data: existingSettings } = await supabase
      .from("eval_settings")
      .select("id")
      .limit(1)
      .single();

    if (existingSettings) {
      await supabase
        .from("eval_settings")
        .update({ speed, cross_functional: crossFunctional, updated_by: "system" })
        .eq("id", existingSettings.id);
    }

    return new Response(
      JSON.stringify({
        message: `${updated}件の改善案のスコアをAIで再計算しました`,
        updated,
        total: items.length,
        scores: scores.map(s => ({ id: s.id, score: s.score, reason: s.reason })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recalculate-impact error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
