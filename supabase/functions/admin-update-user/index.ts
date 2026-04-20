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
const EMAIL_DOMAIN = "kaios.local";

interface UpdateBody {
  user_id?: string | null;          // may be null for unlinked people (only person fields update)
  person_id: string;                // always required
  username?: string;                // change login id
  display_name?: string;
  department?: string;
  role_title?: string;
  years_at_company?: number;
}

function validateUsername(u: string): string | null {
  if (typeof u !== "string") return "ユーザー名が不正です";
  if (u.length < 3 || u.length > 64) return "ユーザー名は3〜64文字で入力してください";
  if (/\s/.test(u)) return "ユーザー名に空白を含めることはできません";
  if (u.includes("@")) return "ユーザー名に @ を含めることはできません";
  return null;
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

    const body = (await req.json()) as UpdateBody;
    if (!body.person_id) return json({ error: "person_id required" }, 400);

    const displayName = (body.display_name ?? "").trim();

    // 1) update auth + profile if linked
    if (body.user_id) {
      if (body.username !== undefined) {
        const trimmed = body.username.trim();
        const err = validateUsername(trimmed);
        if (err) return json({ error: err }, 400);
        const newEmail = `${trimmed}@${EMAIL_DOMAIN}`;
        const { error: emailErr } = await admin.auth.admin.updateUserById(body.user_id, {
          email: newEmail,
          email_confirm: true,
          user_metadata: {
            username: trimmed,
            display_name: displayName || trimmed,
          },
        });
        if (emailErr) return json({ error: `ログインID変更に失敗: ${emailErr.message}` }, 400);
        const { error: profErr } = await admin.from("profiles")
          .update({
            username: trimmed,
            ...(displayName ? { display_name: displayName } : {}),
          })
          .eq("user_id", body.user_id);
        if (profErr) return json({ error: profErr.message }, 400);
      } else if (displayName) {
        await admin.from("profiles").update({ display_name: displayName }).eq("user_id", body.user_id);
        await admin.auth.admin.updateUserById(body.user_id, {
          user_metadata: { display_name: displayName },
        });
      }
    }

    // 2) update people row
    const personUpdates: Record<string, unknown> = {};
    if (displayName) {
      personUpdates.name = displayName;
      personUpdates.avatar_initial = displayName.charAt(0);
    }
    if (body.department !== undefined) personUpdates.department = body.department;
    if (body.role_title !== undefined) personUpdates.role = body.role_title;
    if (body.years_at_company !== undefined) personUpdates.years_at_company = body.years_at_company;

    if (Object.keys(personUpdates).length > 0) {
      const { error: pErr } = await admin.from("people").update(personUpdates).eq("id", body.person_id);
      if (pErr) return json({ error: pErr.message }, 400);
    }

    // 3) refresh author_name_snapshot on past kaizen items if name changed
    if (displayName) {
      await admin.from("kaizen_items")
        .update({ author_name_snapshot: displayName })
        .eq("author_id", body.person_id);
    }

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
