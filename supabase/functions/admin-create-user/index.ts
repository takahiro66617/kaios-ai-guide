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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "管理者権限が必要です" }, 403);

    // 2) parse + validate
    const body = (await req.json()) as CreateUserBody;
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";
    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      return json(
        { error: "ユーザー名は3〜32文字の半角英数字・_.-のみ使用できます" },
        400,
      );
    }
    if (password.length < 6) {
      return json({ error: "パスワードは6文字以上必要です" }, 400);
    }

    const email = `${username}@${EMAIL_DOMAIN}`;

    // 3) create auth user
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: body.display_name || username,
        },
      });
    if (createErr || !created.user) {
      return json({ error: createErr?.message || "作成に失敗しました" }, 400);
    }
    const newUserId = created.user.id;

    // 4) update profile (trigger auto-created it)
    await admin
      .from("profiles")
      .update({ display_name: body.display_name || username })
      .eq("user_id", newUserId);

    // 5) insert role(s)
    const roles: { user_id: string; role: "admin" | "member" }[] = [
      { user_id: newUserId, role: "member" },
    ];
    if (body.is_admin) roles.push({ user_id: newUserId, role: "admin" });
    await admin.from("user_roles").insert(roles);

    // 6) insert people row
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
      .select()
      .single();
    if (personErr) {
      return json({ error: personErr.message }, 400);
    }

    return json({ ok: true, user_id: newUserId, person_id: person.id });
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
