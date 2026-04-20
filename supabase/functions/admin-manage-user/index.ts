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

type Action =
  | { action: "reset_password"; user_id: string; new_password: string }
  | { action: "set_active"; user_id: string; is_active: boolean }
  | { action: "set_admin"; user_id: string; is_admin: boolean }
  | { action: "delete"; user_id: string };

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
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "管理者権限が必要です" }, 403);

    const body = (await req.json()) as Action;
    if (!body.user_id) return json({ error: "user_id required" }, 400);

    // self-protection
    if (body.user_id === userData.user.id && body.action !== "reset_password") {
      return json({ error: "自分自身に対しては実行できません" }, 400);
    }

    if (body.action === "reset_password") {
      if (!body.new_password || body.new_password.length < 6)
        return json({ error: "パスワードは6文字以上必要です" }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.user_id, {
        password: body.new_password,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "set_active") {
      await admin
        .from("profiles")
        .update({ is_active: body.is_active })
        .eq("user_id", body.user_id);
      await admin
        .from("people")
        .update({ is_active: body.is_active })
        .eq("user_id", body.user_id);
      // also disable login by banning when inactive
      await admin.auth.admin.updateUserById(body.user_id, {
        ban_duration: body.is_active ? "none" : "876000h",
      });
      return json({ ok: true });
    }

    if (body.action === "set_admin") {
      if (body.is_admin) {
        await admin
          .from("user_roles")
          .upsert({ user_id: body.user_id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await admin
          .from("user_roles")
          .delete()
          .eq("user_id", body.user_id)
          .eq("role", "admin");
      }
      return json({ ok: true });
    }

    if (body.action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
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
