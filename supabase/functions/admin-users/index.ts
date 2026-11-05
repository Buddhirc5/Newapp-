// Admin account actions that need Supabase's admin API: lock, unlock and
// delete a member. Only admins whose session passed the authenticator step
// (is_admin() = true) can call it, and every action is written to the audit log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "./cors.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(withCors(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: auth } = await asUser.auth.getUser();
  const { data: isAdmin } = await asUser.rpc("is_admin");
  if (!auth.user || isAdmin !== true) return json({ error: "Admins only, with the authenticator step." }, 403);

  const { action, userId } = (await req.json().catch(() => ({}))) as { action?: string; userId?: string };
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Choose a member." }, 400);
  if (userId === auth.user.id) return json({ error: "You can't do that to your own account." }, 400);
  const { data: target } = await service.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (target) return json({ error: "Other admins are managed in Supabase, not here." }, 403);

  const audit = (name: string) =>
    service.from("admin_audit").insert({ actor: auth.user!.id, action: name, target_table: "auth.users", target_id: userId, changes: {} });

  if (action === "lock" || action === "unlock") {
    // A ban stops sign-in and token refresh; existing access tokens expire within the hour.
    const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: action === "lock" ? "87600h" : "none" });
    if (error) return json({ error: error.message }, 500);
    if (action === "lock") await service.rpc("admin_sign_out_member_service", { p_user: userId }).then(() => undefined, () => undefined);
    await audit(action);
    return json({ ok: true });
  }

  if (action === "delete") {
    for (const bucket of ["documents", "listing-photos"]) {
      const { data: files } = await service.storage.from(bucket).list(userId, { limit: 1000 });
      if (files?.length) await service.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
    await audit("delete");
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}));
