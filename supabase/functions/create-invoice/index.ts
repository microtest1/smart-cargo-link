// Server-side invoice generation. Recomputes amount from DB, ignoring any client-supplied totals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateFreightByCbm, getActiveCbmPricing } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};



type ItemInput = { id: string; quantity?: number };

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeInt = (n: unknown, fb = 1) => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : fb;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;
  const admin = createClient(url, service);

  try {
    const body = await req.json().catch(() => ({}));
    const containerId: string = String(body.containerId ?? "").trim();
    const containerName: string = String(body.containerName ?? "").slice(0, 200);
    const rawItems: ItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!uuidRe.test(containerId)) {
      return new Response(JSON.stringify({ error: "Invalid containerId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Normalize + dedupe item ids
    const wanted = new Map<string, number>();
    for (const it of rawItems) {
      const id = String(it?.id ?? "").trim();
      if (!uuidRe.test(id)) continue;
      const q = safeInt(it?.quantity, 1);
      wanted.set(id, q);
    }
    if (wanted.size === 0) {
      return new Response(JSON.stringify({ error: "No valid items" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load profile
    const { data: profile } = await admin.from("profiles")
      .select("user_id, full_name, email, unique_code").eq("user_id", userId).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let userCode: string | null = profile.unique_code;
    if (!userCode) {
      const { data: newCode } = await admin.rpc("generate_user_code" as any);
      if (!newCode) throw new Error("Could not generate user code");
      await admin.from("profiles").update({ unique_code: newCode as string }).eq("user_id", userId);
      userCode = newCode as string;
    }

    // Load container + verify company
    const { data: container } = await admin.from("containers")
      .select("id, container_number, company_id").eq("id", containerId).maybeSingle();
    if (!container) {
      return new Response(JSON.stringify({ error: "Container not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let companyId: string | null = container.company_id;
    if (!companyId) {
      const { data: c } = await admin.from("companies").select("id").limit(1).maybeSingle();
      companyId = c?.id ?? null;
    }
    if (!companyId) throw new Error("No company configuration");

    // Load container items server-side (source of truth for pricing)
    const ids = Array.from(wanted.keys());
    const { data: dbItems, error: itemsErr } = await admin.from("container_items")
      .select("id, container_id, item_name, total_cbm, total_weight, carton_count, quantity, available_quantity")
      .in("id", ids);
    if (itemsErr) throw itemsErr;

    const validItems = (dbItems ?? []).filter((it: any) => it.container_id === containerId);
    if (validItems.length === 0) {
      return new Response(JSON.stringify({ error: "No items match container" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compute totals from DB values only
    let totalCbm = 0, totalWeight = 0, totalCartons = 0;
    const selections: any[] = [];
    for (const it of validItems as any[]) {
      const cbm = Number(it.total_cbm) || 0;
      totalCbm += cbm;
      totalWeight += Number(it.total_weight) || 0;
      totalCartons += Number(it.carton_count) || 0;
    }

    // Official centralized pricing: CBM x baseRate x exchangeRate
    const pricing = await getActiveCbmPricing(admin, "sea_freight");
    const { freightAmount, effectiveRate } = calculateFreightByCbm(totalCbm, pricing);
    const goodsCost = freightAmount;
    const totalAmount = goodsCost;

    // Generate identifiers
    const { data: invoiceNumber } = await admin.rpc("generate_invoice_number" as any);
    const { data: trackingNumber } = await admin.rpc("generate_tracking_number" as any);
    if (!invoiceNumber || !trackingNumber) throw new Error("Failed to generate numbers");

    const productList = validItems.map((i: any) => i.item_name).filter(Boolean).join(", ").slice(0, 500);
    const dims = `${totalCbm.toFixed(4)} CBM | ${Math.round(totalCartons)} CTN`;

    const { data: shipment, error: shipErr } = await admin.from("shipments").insert({
      user_id: userId,
      user_code: userCode,
      company_id: companyId,
      container_id: containerId,
      tracking_number: trackingNumber,
      product: productList || "Selected Goods",
      origin: "China (Nansha)",
      destination: "Ghana",
      weight: totalWeight,
      dimensions: dims,
      status: "pending",
      estimated_delivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Container: ${containerName || container.container_number}. Items: ${validItems.length}`,
    }).select("id").single();
    if (shipErr) throw shipErr;

    const { data: invoice, error: invErr } = await admin.from("invoices").insert({
      invoice_number: invoiceNumber,
      user_id: userId,
      user_code: userCode,
      shipment_id: shipment.id,
      container_id: containerId,
      amount: goodsCost,
      tax_amount: 0,
      total_amount: totalAmount,
      status: "pending",
      currency: pricing.currency,
      shipment_cbm: totalCbm,
      base_cbm_rate: pricing.baseRate,
      exchange_rate: pricing.exchangeRate,
      effective_cbm_rate: effectiveRate,
      freight_subtotal: goodsCost,
      additional_charges: 0,
      pricing_rate_id: pricing.id,
      calculated_at: new Date().toISOString(),
      notes: `Container: ${containerName || container.container_number}. CBM: ${totalCbm.toFixed(6)} | Rate: ${pricing.baseRate} x ${pricing.exchangeRate} = ${pricing.currency} ${effectiveRate.toFixed(2)}/CBM | Weight: ${totalWeight.toFixed(1)}kg | Items: ${validItems.length}`,
    }).select("id").single();
    if (invErr) throw invErr;

    for (const it of validItems as any[]) {
      const qty = safeInt(wanted.get(it.id) ?? it.available_quantity ?? it.quantity ?? 1, 1);
      selections.push({
        container_item_id: it.id,
        container_id: containerId,
        quantity_selected: qty,
        cbm_calculated: Number(it.total_cbm) || 0,
        user_id: userId,
        user_code: userCode,
        status: "invoiced",
        shipment_id: shipment.id,
        invoice_id: invoice.id,
      });
    }
    const { error: selErr } = await admin.from("customer_goods_selections").insert(selections);
    if (selErr) throw selErr;

    return new Response(JSON.stringify({
      invoiceId: invoice.id,
      invoiceNumber,
      shipmentId: shipment.id,
      trackingNumber,
      totalWeight,
      totalCartons,
      goodsCost,
      totalAmount,
      totalCbm,
      currency: pricing.currency,
      baseRate: pricing.baseRate,
      exchangeRate: pricing.exchangeRate,
      effectiveCbmRate: effectiveRate,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-invoice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
