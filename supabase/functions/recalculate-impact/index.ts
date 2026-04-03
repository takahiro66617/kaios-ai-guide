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
    const { axes } = await req.json();

    if (!Array.isArray(axes) || axes.length === 0) {
      return new Response(
        JSON.stringify({ error: "axes は配列で1つ以上指定してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: items, error: fetchError } = await supabase.from("kaizen_items").select("*");
    if (fetchError) throw new Error(`Failed to fetch items: ${fetchError.message}`);
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ message: "改善案が0件のため再計算不要です", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemSummaries = items.map(item => ({
      id: item.id, title: item.title, problem: item.problem,
      solution: item.solution, effect: item.effect, category: item.category,
      reproducibility: item.reproducibility, department: item.department,
      adoptedByCount: (item.adopted_by || []).length, status: item.status,
    }));

    // Build dynamic axis description for AI
    const axisDescriptions = axes.map((a: any, i: number) =>
      `${i + 1}. ${a.name}（${a.key}）: ウェイト ${a.weight}%\n   → ${a.description || "詳細なし"}`
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
            content: `あなたは企業の改善活動のインパクトを評価するAIです。

以下の評価軸とウェイトに基づいて、各改善案のインパクトスコア（0〜100）を算出してください。

【評価軸】
${axisDescriptions}

各改善案のIDとスコアをJSON配列で返してください。`,
          },
          { role: "user", content: JSON.stringify(itemSummaries) },
        ],
        tools: [{
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
        }],
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
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        scores = Array.isArray(parsed) ? parsed : parsed.scores || [];
      }
    }

    let updated = 0;
    for (const s of scores) {
      const clampedScore = Math.max(0, Math.min(100, Math.round(s.score)));
      const { error } = await supabase
        .from("kaizen_items")
        .update({ impact_score: clampedScore })
        .eq("id", s.id);
      if (!error) updated++;
    }

    return new Response(
      JSON.stringify({
        message: `${updated}件の改善案のスコアをAIで再計算しました`,
        updated, total: items.length,
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
