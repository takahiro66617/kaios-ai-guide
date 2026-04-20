// One-shot bootstrap to create the initial "admin" account.
// Safe to call repeatedly: returns an error if any admin already exists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAIL_DOMAIN = "kaios.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Refuse if an admin already exists
    const { count } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      return json({ error: "管理者は既に存在します。" }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const username = (body.username || "admin").toString().toLowerCase();
    const password = body.password || "admin1234";
    const display_name = body.display_name || "管理者";

    const email = `${username}@${EMAIL_DOMAIN}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name },
    });
    if (error || !created.user) {
      return json({ error: error?.message || "作成失敗" }, 400);
    }
    await admin
      .from("profiles")
      .update({ display_name })
      .eq("user_id", created.user.id);
    await admin.from("user_roles").insert([
      { user_id: created.user.id, role: "admin" },
      { user_id: created.user.id, role: "member" },
    ]);
    await admin.from("people").insert({
      name: display_name,
      department: "経営企画部",
      role: "管理者",
      years_at_company: 1,
      avatar_initial: display_name.charAt(0),
      user_id: created.user.id,
    });

    return json({ ok: true, username, password });
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
