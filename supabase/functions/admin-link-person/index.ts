import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Link an existing auth user to an existing (unlinked) people row.
// For "create new account for existing person", use admin-create-user with link_person_id.
interface LinkBody {
  person_id: string;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "管理者権限が必要です" }, 403);

    const body = (await req.json()) as LinkBody;
    if (!body.person_id || !body.user_id) {
      return json({ error: "person_id, user_id required" }, 400);
    }

    // verify the user_id exists and isn't already linked to another people row
    const { data: existing } = await admin.from("people")
      .select("id").eq("user_id", body.user_id).maybeSingle();
    if (existing && existing.id !== body.person_id) {
      return json({ error: "このアカウントは既に他の提案者と紐付いています" }, 400);
    }

    const { error } = await admin.from("people")
      .update({ user_id: body.user_id })
      .eq("id", body.person_id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
