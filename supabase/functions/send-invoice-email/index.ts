import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getActiveCbmPricing } from "../_shared/pricing.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication Check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only accept invoiceId from payload
    const payload = await req.json();
    const invoiceId = payload?.invoiceId;
    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing invoiceId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role to load all data server-side
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load invoice and verify ownership
    const { data: invoice, error: invoiceError } = await adminSupabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the invoice belongs to the authenticated user
    if (invoice.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Load customer profile from DB
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, email, unique_code")
      .eq("user_id", invoice.user_id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: "Customer email not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Load container name if available
    let containerName = "N/A";
    if (invoice.container_id) {
      const { data: container } = await adminSupabase
        .from("containers")
        .select("container_number")
        .eq("id", invoice.container_id)
        .single();
      if (container) containerName = container.container_number;
    }

    // Load shipment tracking number
    let trackingNumber = "N/A";
    if (invoice.shipment_id) {
      const { data: shipment } = await adminSupabase
        .from("shipments")
        .select("tracking_number")
        .eq("id", invoice.shipment_id)
        .single();
      if (shipment) trackingNumber = shipment.tracking_number;
    }

    // Load goods selections for this invoice
    const { data: selections } = await adminSupabase
      .from("customer_goods_selections")
      .select("quantity_selected, cbm_calculated, container_item_id")
      .eq("invoice_id", invoiceId);

    // Load fulfillment info
    const { data: fulfillment } = await adminSupabase
      .from("order_fulfillments")
      .select("fulfillment_type, delivery_address")
      .eq("invoice_id", invoiceId)
      .single();

    // Build items list from DB selections
    const items: Array<{ name: string; quantity: number; cbm: number; price: number }> = [];
    let totalCbm = 0;
    let totalWeight = 0;
    // Historical invoices keep their own snapshot; new ones use the active centralized rate.
    const activePricing = await getActiveCbmPricing(adminSupabase, "sea_freight");
    const pricing = (invoice as any).base_cbm_rate
      ? {
          id: (invoice as any).pricing_rate_id ?? null,
          baseRate: Number((invoice as any).base_cbm_rate),
          exchangeRate: Number((invoice as any).exchange_rate),
          effectiveRate: Number((invoice as any).effective_cbm_rate),
          currency: (invoice as any).currency || "GHS",
        }
      : activePricing;
    const CBM_RATE = pricing.effectiveRate;
    const CURRENCY = pricing.currency;

    if (selections && selections.length > 0) {
      const itemIds = selections.map((s: any) => s.container_item_id);
      const { data: containerItems } = await adminSupabase
        .from("container_items")
        .select("id, item_name, total_cbm, total_weight, unit_price, quantity")
        .in("id", itemIds);

      for (const sel of selections) {
        const ci = containerItems?.find((c: any) => c.id === sel.container_item_id);
        if (ci) {
          const cbm = Number(sel.cbm_calculated) || Number(ci.total_cbm) || 0;
          items.push({
            name: ci.item_name,
            quantity: Number(sel.quantity_selected) || 1,
            cbm,
            price: cbm * CBM_RATE,
          });
          totalCbm += cbm;
          totalWeight += Number(ci.total_weight) || 0;
        }
      }
    }

    // Use DB values for amounts
    const cbmForInvoice = Number((invoice as any).shipment_cbm) || totalCbm;
    const goodsCost = Number((invoice as any).freight_subtotal) || Math.round(cbmForInvoice * CBM_RATE * 100) / 100;
    const totalAmount = Number(invoice.total_amount) || goodsCost;
    const deliveryFee = totalAmount - goodsCost > 0 ? Math.round((totalAmount - goodsCost) * 100) / 100 : 0;
    const money = (n: number) => `${CURRENCY} ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const customerName = escapeHtml(profile.full_name || "Customer");
    const customerEmail = profile.email;
    const customerCode = escapeHtml(profile.unique_code || invoice.user_code || "N/A");
    const invoiceNumber = escapeHtml(invoice.invoice_number);

    const fulfillmentType = fulfillment?.fulfillment_type || "self_pickup";
    const deliveryAddress = fulfillment?.delivery_address || "";

    const fulfillmentLabel = fulfillmentType === "self_pickup"
      ? "Self Pickup"
      : fulfillmentType === "delivery"
        ? "Delivery"
        : "Third-Party Pickup";

    console.log("Sending invoice email for:", invoice.invoice_number, "to:", customerEmail, "by user:", user.id);

    // Generate items table rows
    const itemsHtml = items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 14px; color: #374151;">${index + 1}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151;">${escapeHtml(item.name)}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; text-align: right;">${item.cbm.toFixed(4)}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; text-align: right;">${money(item.price)}</td>
      </tr>
    `).join("");

    const currentDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // email-assets bucket is private: generate a short-lived signed URL for the logo
    let logoUrl = "";
    try {
      const { data: signed } = await adminSupabase.storage
        .from("email-assets")
        .createSignedUrl("amoliga-logo.png", 60 * 60 * 24 * 7);
      logoUrl = signed?.signedUrl ?? "";
    } catch (_e) {
      logoUrl = "";
    }


    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="Amoliga Elite" style="height: 60px; margin-bottom: 16px;">` : ""}
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">INVOICE</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Amoliga Elite Freight & Logistics</p>
    </div>
    <div style="background: white; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="margin-bottom: 16px;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Invoice Number</p>
          <p style="color: #1f2937; font-size: 18px; font-weight: 700; margin: 0;">${invoiceNumber}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Tracking Number</p>
          <p style="color: #1f2937; font-size: 18px; font-weight: 700; margin: 0;">${escapeHtml(trackingNumber)}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Date</p>
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">${currentDate}</p>
        </div>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase;">Bill To</h3>
        <p style="color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">${customerName}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">Customer Code: ${customerCode}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Container: ${escapeHtml(containerName)}</p>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 120px; background: #eff6ff; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0;">${totalCbm.toFixed(4)}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">Total CBM</p>
        </div>
        <div style="flex: 1; min-width: 120px; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #166534; font-size: 24px; font-weight: 700; margin: 0;">${totalWeight.toFixed(1)}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">Weight (kg)</p>
        </div>
        <div style="flex: 1; min-width: 120px; background: #fef3c7; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #92400e; font-size: 24px; font-weight: 700; margin: 0;">${items.length}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">Items</p>
        </div>
      </div>
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase;">Invoice Items</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">#</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Item</th>
              <th style="padding: 12px 8px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">CBM</th>
              <th style="padding: 12px 8px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📦 Fulfillment Method</h3>
        <p style="color: #78350f; font-size: 16px; font-weight: 600; margin: 0;">${fulfillmentLabel}</p>
        ${deliveryAddress ? `<p style="color: #92400e; font-size: 14px; margin: 8px 0 0 0;">📍 ${escapeHtml(deliveryAddress)}</p>` : ""}
      </div>
      <div style="background: #1e40af; border-radius: 12px; padding: 20px; color: white;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; opacity: 0.9;">Total CBM</span>
          <span style="font-size: 14px; font-weight: 600;">${cbmForInvoice.toFixed(4)} CBM</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; opacity: 0.9;">Freight Rate ${pricing.baseRate} × Conversion ${pricing.exchangeRate}</span>
          <span style="font-size: 14px; font-weight: 600;">${money(CBM_RATE)} / CBM</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; opacity: 0.9;">Sea Freight Subtotal</span>
          <span style="font-size: 14px; font-weight: 600;">${money(goodsCost)}</span>
        </div>
        ${deliveryFee > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; opacity: 0.9;">Delivery &amp; Other Approved Charges</span>
          <span style="font-size: 14px; font-weight: 600;">${money(deliveryFee)}</span>
        </div>
        ` : ""}
        <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between;">
          <span style="font-size: 18px; font-weight: 700;">TOTAL AMOUNT</span>
          <span style="font-size: 24px; font-weight: 700;">${money(totalAmount)}</span>
        </div>
      </div>
    </div>
    <div style="background: #1f2937; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px 0;">
        <strong style="color: white;">Amoliga Elite Freight & Logistics</strong>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px 0;">📍 China → Ghana Cargo Services</p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px 0;">📞 +233 20 887 8817 | 📧 amoligaelite@gmail.com</p>
      <p style="color: #6b7280; font-size: 11px; margin: 16px 0 0 0;">
        This invoice was generated automatically. For questions, please contact customer support.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Amoliga Elite <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Invoice ${invoice.invoice_number} - Amoliga Elite Freight`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invoice email sent successfully:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
