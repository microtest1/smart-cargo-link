// PREPARED FOR REVIEW — NOT DEPLOYED. Move to supabase/functions/goods-photo-access after approval.
// Customer photo viewer: requires a signed-in customer and checks the record belongs to them.
// Streams image bytes; never returns storage URLs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return new Response("Not configured", { status: 500, headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

  const q = new URL(req.url).searchParams;
  const recordId = q.get("record") ?? "";
  const photoId = q.get("photo");
  if (!UUID.test(recordId) || (photoId && !UUID.test(photoId))) return new Response("Bad request", { status: 400, headers: cors });

  const admin = createClient(url, service);
  const { data: profile } = await admin.from("profiles").select("unique_code").eq("user_id", user.id).maybeSingle();
  const { data: rec } = await admin.from("new_client_sms")
    .select("id, product_description, customer_user_id, customer_user_code").eq("id", recordId).maybeSingle();
  const owns = rec && (rec.customer_user_id === user.id ||
    (rec.customer_user_code && profile?.unique_code && rec.customer_user_code === profile.unique_code));
  if (!owns) return new Response("Not found", { status: 404, headers: cors }); // same answer as missing

  if (!photoId) {
    const { data: photos } = await admin.from("warehouse_goods_photos")
      .select("id, content_type").eq("record_id", recordId).is("removed_at", null).order("created_at");
    await admin.from("audit_logs").insert({ user_id: user.id, action: "goods_photos_viewed", entity_type: "new_client_sms", entity_id: recordId });
    return Response.json({ product: rec.product_description, photos: photos ?? [] }, { headers: cors });
  }

  const { data: photo } = await admin.from("warehouse_goods_photos")
    .select("storage_path, content_type").eq("id", photoId).eq("record_id", recordId).is("removed_at", null).maybeSingle();
  if (!photo) return new Response("Not found", { status: 404, headers: cors });
  const { data: file, error } = await admin.storage.from("warehouse-goods-photos").download(photo.storage_path);
  if (error || !file) return new Response("Unavailable", { status: 502, headers: cors });
  return new Response(file, { headers: { ...cors, "Content-Type": photo.content_type, "Cache-Control": "private, no-store" } });
});
