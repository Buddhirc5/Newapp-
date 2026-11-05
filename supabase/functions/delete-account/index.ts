// Permanently deletes the signed-in member's account and data.
// Profiles, listings, messages, insights and other rows are removed by the
// database's ON DELETE CASCADE rules; uploaded files are removed here first.
// Payment records are kept (with the member unlinked) because the law requires
// businesses to keep financial records.
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "./cors.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(withCors(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return json({ error: "Sign in first." }, 401);

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400);

  const { data: admin } = await service.from("admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (admin) return json({ error: "Admin accounts can't be deleted here. Remove admin access in Supabase first." }, 403);

  for (const bucket of ["documents", "listing-photos"]) {
    const { data: files } = await service.storage.from(bucket).list(auth.user.id, { limit: 1000 });
    if (files?.length) await service.storage.from(bucket).remove(files.map((f) => `${auth.user!.id}/${f.name}`));
  }
  const { error } = await service.auth.admin.deleteUser(auth.user.id);
  if (error) return json({ error: "Couldn't delete the account. Try again or contact us." }, 500);
  return json({ deleted: true });
}));
