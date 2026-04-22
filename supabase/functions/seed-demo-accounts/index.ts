import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAIL_DOMAIN = "kaios.local";

interface DemoAccount {
  username: string;
  password: string;
  display_name: string;
  department: string;
  is_admin: boolean;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "yamada", password: "kaios1234", display_name: "山田 太郎", department: "製造部", is_admin: false },
  { username: "sato",   password: "kaios1234", display_name: "佐藤 花子", department: "品質保証部", is_admin: false },
  { username: "admin",  password: "admin1234", display_name: "管理者",     department: "管理部",     is_admin: true  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const results: Array<{ username: string; action: string; error?: string }> = [];

    for (const acc of DEMO_ACCOUNTS) {
      const email = `${acc.username}@${EMAIL_DOMAIN}`;

      // Find existing auth user by listing (paginate small)
      let existingId: string | null = null;
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
      if (found) existingId = found.id;

      if (existingId) {
        // Reset password & confirm email
        const { error: upErr } = await admin.auth.admin.updateUserById(existingId, {
          password: acc.password,
          email_confirm: true,
        });
        if (upErr) { results.push({ username: acc.username, action: "update_failed", error: upErr.message }); continue; }
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          password: acc.password,
          email_confirm: true,
        });
        if (cErr || !created.user) { results.push({ username: acc.username, action: "create_failed", error: cErr?.message }); continue; }
        existingId = created.user.id;
      }

      // Upsert profile
      await admin.from("profiles").upsert(
        { user_id: existingId, username: acc.username, display_name: acc.display_name, is_active: true },
        { onConflict: "user_id" },
      );

      // Ensure roles: always member; admin if specified
      await admin.from("user_roles").delete().eq("user_id", existingId);
      const roles: Array<{ user_id: string; role: "admin" | "member" }> = [{ user_id: existingId, role: "member" }];
      if (acc.is_admin) roles.push({ user_id: existingId, role: "admin" });
      await admin.from("user_roles").insert(roles);

      // Ensure people row linked to this auth user (members only — admin doesn't need a person)
      if (!acc.is_admin) {
        const { data: existingPerson } = await admin
          .from("people")
          .select("id")
          .eq("user_id", existingId)
          .maybeSingle();
        if (!existingPerson) {
          await admin.from("people").insert({
            user_id: existingId,
            name: acc.display_name,
            department: acc.department,
            role: "メンバー",
            avatar_initial: acc.display_name.slice(0, 1),
            years_at_company: 1,
            is_active: true,
          });
        }
      }

      results.push({ username: acc.username, action: existingId ? "ok" : "created" });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
