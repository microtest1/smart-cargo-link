// Sends SMS + Email for a shipment status change (5-stage canonical timeline).
// Admin/manager authenticated. In-app notifications are handled by the DB trigger.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-company-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


type StageKey =
  | "received_china"
  | "processing"
  | "in_transit"
  | "arrived_ghana"
  | "ready_collection";

const STAGES: Record<StageKey, { label: string; emoji: string; message: string }> = {
  received_china: {
    label: "Goods Received in China",
    emoji: "✅",
    message: "Your goods have been received at our China warehouse.",
  },
  processing: {
    label: "Shipment Processing",
    emoji: "📦",
    message: "Your shipment is currently being processed.",
  },
  in_transit: {
    label: "Goods in Transit",
    emoji: "🚢",
    message: "Your shipment has left China and is currently in transit.",
  },
  arrived_ghana: {
    label: "Arrived in Ghana / Customs Clearance",
    emoji: "🇬🇭",
    message: "Your shipment has arrived in Ghana and is undergoing customs clearance.",
  },
  ready_collection: {
    label: "Ready for Collection",
    emoji: "📋",
    message: "Your shipment is ready for collection. Please contact us or arrange delivery.",
  },
};

function mapToStage(status: string | null | undefined): StageKey {
  const s = (status || "").toLowerCase().trim();
  if (["received_china", "received", "pending", "in_warehouse", "packed"].includes(s)) return "received_china";
  if (s === "processing") return "processing";
  if (["in_transit", "in-transit", "shipped", "left_china"].includes(s)) return "in_transit";
  if (["arrived_ghana", "arrived", "customs"].includes(s)) return "arrived_ghana";
  if (["ready_collection", "ready_for_pickup", "ready", "delivered"].includes(s)) return "ready_collection";
  return "received_china";
}

function formatPhone(raw: string): string | null {
  let p = String(raw).replace(/[^0-9+]/g, "").replace("+", "");
  if (p.startsWith("0")) p = "233" + p.substring(1);
  if (!/^233[0-9]{9}$/.test(p)) return null;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const companyToken = req.headers.get("x-company-token");
    let allowedCompanyId: string | null = null;

    if (companyToken && companyToken.length >= 32) {
      // Company admin session (custom token auth).
      const { data: sessionData } = await admin.rpc("verify_company_session", {
        p_token: companyToken,
      });
      const verified = (sessionData as any)?.[0];
      if (!verified?.valid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      allowedCompanyId = verified.company_id;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );

      const { data: authData, error: authError } = await userClient.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .in("role", ["admin", "manager"]);

      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const shipmentId: string | undefined = body?.shipmentId;
    if (!shipmentId || !/^[0-9a-f-]{36}$/i.test(shipmentId)) {
      return new Response(JSON.stringify({ error: "Valid shipmentId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side load: never trust client-provided status or contact details.
    const { data: shipment, error: shipErr } = await admin
      .from("shipments")
      .select("id, tracking_number, product, status, user_code, user_id, company_id")
      .eq("id", shipmentId)
      .maybeSingle();

    if (shipErr || !shipment) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Company admins may only notify for their own company's shipments.
    if (allowedCompanyId && shipment.company_id !== allowedCompanyId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const stage = STAGES[mapToStage(shipment.status)];
    const title = `${stage.emoji} ${stage.label}`;
    const text = `${stage.message} Tracking: ${shipment.tracking_number}`;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone, email")
      .eq("unique_code", shipment.user_code)
      .maybeSingle();

    const results: Record<string, unknown> = { stage: mapToStage(shipment.status), sms: "skipped", email: "skipped" };

    // ---- SMS via Hubtel ----
    const clientId = Deno.env.get("HUBTEL_SMS_CLIENT_ID");
    const clientSecret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET");
    const phone = profile?.phone ? formatPhone(profile.phone) : null;

    if (clientId && clientSecret && phone) {
      try {
        const smsUrl = new URL("https://sms.hubtel.com/v1/messages/send");
        smsUrl.searchParams.set("clientid", clientId);
        smsUrl.searchParams.set("clientsecret", clientSecret);
        smsUrl.searchParams.set("from", "Amoliga");
        smsUrl.searchParams.set("to", phone);
        smsUrl.searchParams.set("content", `Amoliga Elite Freight: ${stage.label}. ${text}`.substring(0, 320));
        const res = await fetch(smsUrl.toString());
        const raw = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(raw); } catch { /* ignore */ }
        results.sms = parsed?.status === 0 ? "sent" : `failed:${parsed?.statusDescription ?? res.status}`;
      } catch (e) {
        results.sms = "failed";
        console.error("SMS error", e instanceof Error ? e.message : e);
      }
    } else if (!phone) {
      results.sms = "no_valid_phone";
    } else {
      results.sms = "not_configured";
    }

    // ---- Email via Resend (optional) ----
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && profile?.email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Amoliga Elite Freight <onboarding@resend.dev>",
            to: [profile.email],
            subject: `${title} — ${shipment.tracking_number}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px">
                <h2 style="margin:0 0 8px">${title}</h2>
                <p>Hello ${profile.full_name ?? "Customer"},</p>
                <p>${stage.message}</p>
                <table style="border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:4px 12px 4px 0"><b>Tracking</b></td><td>${shipment.tracking_number}</td></tr>
                  <tr><td style="padding:4px 12px 4px 0"><b>Item</b></td><td>${String(shipment.product).slice(0, 80)}</td></tr>
                  <tr><td style="padding:4px 12px 4px 0"><b>Stage</b></td><td>${stage.label}</td></tr>
                </table>
                <p style="color:#666;font-size:12px">Amoliga Elite Freight &amp; Logistics</p>
              </div>`,
          }),
        });
        results.email = res.ok ? "sent" : `failed:${res.status}`;
      } catch (e) {
        results.email = "failed";
        console.error("Email error", e instanceof Error ? e.message : e);
      }
    } else if (!profile?.email) {
      results.email = "no_email";
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-shipment-status error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
