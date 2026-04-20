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

interface CreateUserBody {
  username: string;
  password: string;
  display_name: string;
  department: string;
  role_title: string;
  years_at_company: number;
  is_admin: boolean;
  // optional: link to an existing people row instead of creating a new one
  link_person_id?: string;
}

// Username rule: 3-64 chars, no whitespace, no '@'
function validateUsername(u: string): string | null {
  if (typeof u !== "string") return "ユーザー名が不正です";
  if (u.length < 3 || u.length > 64) return "ユーザー名は3〜64文字で入力してください";
  if (/\s/.test(u)) return "ユーザー名に空白を含めることはできません";
  if (u.includes("@")) return "ユーザー名に @ を含めることはできません";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const body = (await req.json()) as CreateUserBody;
    const username = (body.username || "").trim();
    const password = body.password || "";
    const usernameErr = validateUsername(username);
    if (usernameErr) return json({ error: usernameErr }, 400);
    if (password.length < 6) return json({ error: "パスワードは6文字以上必要です" }, 400);

    const email = `${username}@${EMAIL_DOMAIN}`;

    // create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        username,
        display_name: body.display_name || username,
      },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message || "作成に失敗しました" }, 400);
    }
    const newUserId = created.user.id;

    // update profile (trigger auto-creates it)
    await admin.from("profiles")
      .update({ display_name: body.display_name || username, username })
      .eq("user_id", newUserId);

    // roles
    const roles: { user_id: string; role: "admin" | "member" }[] = [
      { user_id: newUserId, role: "member" },
    ];
    if (body.is_admin) roles.push({ user_id: newUserId, role: "admin" });
    await admin.from("user_roles").insert(roles);

    let personId: string;
    if (body.link_person_id) {
      // link existing people row to this new auth user
      const { data: linked, error: linkErr } = await admin
        .from("people")
        .update({
          user_id: newUserId,
          name: body.display_name || username,
          department: body.department,
          role: body.role_title || "",
          years_at_company: body.years_at_company || 1,
          avatar_initial: (body.display_name || username).charAt(0),
          is_active: true,
        })
        .eq("id", body.link_person_id)
        .select().single();
      if (linkErr || !linked) {
        // rollback auth user
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: linkErr?.message || "提案者への紐付けに失敗しました" }, 400);
      }
      personId = linked.id;
    } else {
      const { data: person, error: personErr } = await admin
        .from("people")
        .insert({
          name: body.display_name || username,
          department: body.department,
          role: body.role_title || "",
          years_at_company: body.years_at_company || 1,
          avatar_initial: (body.display_name || username).charAt(0),
          user_id: newUserId,
        })
        .select().single();
      if (personErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: personErr.message }, 400);
      }
      personId = person.id;
    }

    return json({
      ok: true,
      user_id: newUserId,
      person_id: personId,
      username,
      password, // returned once so the admin can copy and hand to the user
    });
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
