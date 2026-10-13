// Hubtel Programmable Services — USSD Service Interaction endpoint
// Spec: https://developers.hubtel.com/docs/business/api_documentation/programmable_services/documentation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

const SUPPORT_PHONE = "+233 20 000 0000";
const SUPPORT_EMAIL = "support@amoligaelitegroupltd.com";

// Canonical 5-stage shipment timeline (kept in sync with src/lib/shipmentStages.ts)
type StageKey = "received_china" | "processing" | "in_transit" | "arrived_ghana" | "ready_collection";
const STAGES: Record<StageKey, { label: string; emoji: string }> = {
  received_china: { label: "Goods Received in China", emoji: "✅" },
  processing: { label: "Shipment Processing", emoji: "📦" },
  in_transit: { label: "Goods in Transit", emoji: "🚢" },
  arrived_ghana: { label: "Arrived in Ghana / Customs Clearance", emoji: "🇬🇭" },
  ready_collection: { label: "Ready for Collection", emoji: "📋" },
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

function mask(m: string | undefined | null): string | null {
  if (!m) return null;
  const s = String(m);
  if (s.length < 5) return "***";
  return s.slice(0, 3) + "****" + s.slice(-2);
}

function safeJson(input: string): any {
  try { return JSON.parse(input); } catch { return null; }
}

// Hubtel USSD Response shape (documented):
// { SessionId, Type: "Response" | "Release", Message, Label?, ClientState?, DataType?, FieldType? }
function ussdResponse(opts: {
  SessionId: string;
  Type: "Response" | "Release";
  Message: string;
  Label?: string;
  ClientState?: string;
  DataType?: string;
  FieldType?: string;
}) {
  const body: Record<string, unknown> = {
    SessionId: opts.SessionId,
    Type: opts.Type,
    Message: opts.Message,
  };
  if (opts.Label) body.Label = opts.Label;
  if (opts.ClientState) body.ClientState = opts.ClientState;
  if (opts.DataType) body.DataType = opts.DataType;
  if (opts.FieldType) body.FieldType = opts.FieldType;
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let raw = "";
  let payload: any = null;
  let responseBody: any = null;
  let httpStatus = 200;
  let processingStatus = "ok";
  let errorMessage: string | null = null;
  let sessionId: string | null = null;
  let mobile: string | null = null;

  try {
    raw = await req.text();
    payload = safeJson(raw) ?? {};

    // Hubtel documented incoming fields
    sessionId = payload.SessionId ?? payload.sessionId ?? null;
    mobile = payload.Mobile ?? payload.mobile ?? payload.MSISDN ?? null;
    const serviceCode: string = payload.ServiceCode ?? payload.serviceCode ?? "";
    const type: string = payload.Type ?? payload.type ?? "Initiation";
    const message: string = (payload.Message ?? payload.message ?? "").toString().trim();
    const sequence: number = Number(payload.Sequence ?? payload.sequence ?? 1);
    const clientState: string | undefined = payload.ClientState ?? payload.clientState ?? undefined;

    if (!sessionId) {
      responseBody = { error: "SessionId is required" };
      httpStatus = 400;
      processingStatus = "invalid_request";
      return new Response(JSON.stringify(responseBody), {
        status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "Release" || type === "Timeout") {
      responseBody = ussdResponse({
        SessionId: sessionId, Type: "Release",
        Message: "Session ended. Thank you for using Amoliga Elite Freight.",
      });
      return new Response(JSON.stringify(responseBody), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load / init session state
    const { data: existing } = await supabase
      .from("hubtel_ussd_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    // Hubtel is stateless: authoritative step comes from ClientState the gateway echoes back.
    // Fall back to persisted session state, otherwise start at "menu".
    let state: any = existing?.state ?? { step: clientState || "menu" };
    if (clientState) state = { ...state, step: clientState };

    // Handle Initiation - show menu
    if (type === "Initiation") {
      state = { step: "menu" };
      await supabase.from("hubtel_ussd_sessions").upsert({
        session_id: sessionId, mobile: mobile ?? null, service_code: serviceCode, state,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });

      responseBody = ussdResponse({
        SessionId: sessionId, Type: "Response",
        Label: "Amoliga Elite Freight",
        Message: "Welcome to Amoliga Elite Freight & Logistics\n1. Track shipment\n2. Pay delivery fee\n3. Contact support",
        DataType: "input", FieldType: "text",
        ClientState: "menu",
      });
      return new Response(JSON.stringify(responseBody), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure a session row exists for Response calls (Hubtel may not send Initiation in some flows)
    if (!existing) {
      await supabase.from("hubtel_ussd_sessions").upsert({
        session_id: sessionId, mobile: mobile ?? null, service_code: serviceCode, state,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });
    }

    // Handle Response type - process user input
    const step: string = state.step ?? "menu";

    if (step === "menu") {
      if (message === "1") {
        state = { step: "await_tracking" };
        await supabase.from("hubtel_ussd_sessions").update({ state, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Response",
          Label: "Track shipment",
          Message: "Enter your tracking code (e.g. TRK-000123):",
          DataType: "input", FieldType: "text",
          ClientState: "await_tracking",
        });
      } else if (message === "2") {
        state = { step: "await_invoice" };
        await supabase.from("hubtel_ussd_sessions").update({ state, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Response",
          Label: "Pay delivery fee",
          Message: "Enter invoice number, delivery reference or tracking code:",
          DataType: "input", FieldType: "text",
          ClientState: "await_invoice",
        });
      } else if (message === "3") {
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Release",
          Message: `Amoliga Support:\nPhone: ${SUPPORT_PHONE}\nEmail: ${SUPPORT_EMAIL}`,
        });
      } else {
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Response",
          Label: "Invalid choice",
          Message: "Invalid choice. Reply:\n1. Track shipment\n2. Pay delivery fee\n3. Contact support",
          DataType: "input", FieldType: "text",
          ClientState: "menu",
        });
      }
    } else if (step === "await_tracking") {
      const code = message.toUpperCase().trim();
      if (!/^[A-Z0-9\-]{3,40}$/.test(code)) {
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Release",
          Message: "Invalid tracking code format. Please try again later.",
        });
      } else {
        const { data: ship } = await supabase
          .from("shipments")
          .select("tracking_number, product, status, updated_at, container_id, containers(container_number)")
          .eq("tracking_number", code)
          .maybeSingle();
        if (!ship) {
          responseBody = ussdResponse({
            SessionId: sessionId, Type: "Release",
            Message: `Tracking code ${code} not found. Please verify and try again.`,
          });
        } else {
          const container = (ship as any).containers?.container_number ?? "N/A";
          const updated = new Date(ship.updated_at).toISOString().slice(0, 10);
          const stage = STAGES[mapToStage(ship.status)];
          responseBody = ussdResponse({
            SessionId: sessionId, Type: "Release",
            Message: `Shipment ${ship.tracking_number}\nItem: ${String(ship.product).slice(0, 40)}\nStatus: ${stage.emoji} ${stage.label}\nUpdated: ${updated}\nContainer: ${container}`,
          });
        }

      }
    } else if (step === "await_invoice") {
      const ref = message.trim();
      // Look up delivery request by tracking number or invoice number
      let deliveryReq: any = null;
      let invoice: any = null;

      const { data: inv } = await supabase.from("invoices")
        .select("id, invoice_number, total_amount, amount_paid, status, shipment_id")
        .eq("invoice_number", ref).maybeSingle();
      if (inv) invoice = inv;

      const { data: dr } = await supabase.from("delivery_requests")
        .select("id, user_code, delivery_cost, amount, payment_status, shipments(tracking_number)")
        .or(`id.eq.${/^[0-9a-f-]{36}$/i.test(ref) ? ref : "00000000-0000-0000-0000-000000000000"}`)
        .maybeSingle();
      if (dr) deliveryReq = dr;

      if (!invoice && !deliveryReq) {
        // Try tracking number → outstanding invoice first, then latest unpaid delivery
        const { data: shp } = await supabase.from("shipments").select("id").eq("tracking_number", ref.toUpperCase()).maybeSingle();
        if (shp) {
          const { data: invByShip } = await supabase.from("invoices")
            .select("id, invoice_number, total_amount, amount_paid, status, shipment_id")
            .eq("shipment_id", shp.id).in("status", ["pending", "partially_paid"])
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (invByShip) invoice = invByShip;

          if (!invoice) {
            const { data: drByShip } = await supabase.from("delivery_requests")
              .select("id, user_code, delivery_cost, amount, payment_status, shipments(tracking_number)")
              .eq("shipment_id", shp.id).neq("payment_status", "paid")
              .order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (drByShip) deliveryReq = drByShip;
          }
        }
      }

      // Invoices support partial payments: bill only the outstanding balance.
      const amount = invoice
        ? Math.max(0, Number(invoice.total_amount ?? 0) - Number(invoice.amount_paid ?? 0))
        : deliveryReq ? Number(deliveryReq.delivery_cost ?? deliveryReq.amount) : 0;

      if (!invoice && !deliveryReq) {

        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Release",
          Message: `No unpaid record found for ${ref}. Please check and try again.`,
        });
      } else if ((invoice?.status === "paid") || (deliveryReq?.payment_status === "paid") || amount <= 0) {
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Release",
          Message: `This item is fully paid. Thank you.`,
        });

      } else {
        state = {
          step: "confirm_pay",
          invoice_id: invoice?.id ?? null,
          delivery_request_id: deliveryReq?.id ?? null,
          amount: amount,
          ref: ref,
        };
        await supabase.from("hubtel_ussd_sessions").update({ state, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Response",
          Label: "Confirm payment",
          Message: `Pay GHS ${amount.toFixed(2)} for ${ref}?\n1. Confirm\n2. Cancel`,
          DataType: "input", FieldType: "text",
          ClientState: "confirm_pay",
        });
      }
    } else if (step === "confirm_pay") {
      if (message === "1") {
        // AddToCart response — Hubtel USSD payment collection.
        // On confirmation we return AddToCart with Item; Hubtel bills the subscriber via the assigned Service.
        // Fulfillment URL will then be invoked server-to-server.
        const clientReference = `USSD-${sessionId.slice(-10)}-${Date.now().toString(36)}`.substring(0, 32).toUpperCase();
        await supabase.from("hubtel_ussd_fulfillments").insert({
          client_reference: clientReference,
          session_id: sessionId,
          mobile: mobile,
          amount: state.amount,
          invoice_id: state.invoice_id ?? null,
          delivery_request_id: state.delivery_request_id ?? null,
          status: "initiated",
          raw_request: payload,
        });
        responseBody = {
          SessionId: sessionId,
          Type: "AddToCart",
          Item: {
            ItemName: `Amoliga Delivery/Invoice ${state.ref}`,
            Qty: 1,
            Price: Number(state.amount),
          },
          Message: `You will be billed GHS ${Number(state.amount).toFixed(2)} for ${state.ref}.`,
          ClientReference: clientReference,
          Label: "Payment",
        };
      } else {
        responseBody = ussdResponse({
          SessionId: sessionId, Type: "Release",
          Message: "Payment cancelled. Thank you.",
        });
      }
    } else {
      responseBody = ussdResponse({
        SessionId: sessionId, Type: "Release",
        Message: "Session error. Please dial again.",
      });
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    processingStatus = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    httpStatus = 200; // Never leak 500 to USSD gateway
    responseBody = {
      SessionId: sessionId ?? "unknown",
      Type: "Release",
      Message: "Service temporarily unavailable. Please try again shortly.",
    };
    return new Response(JSON.stringify(responseBody), {
      status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try {
      await supabase.from("hubtel_ussd_logs").insert({
        endpoint_type: "service_interaction",
        session_id: sessionId,
        mobile_number_masked: mask(mobile),
        request_payload: payload ?? { raw },
        response_payload: responseBody,
        http_status: httpStatus,
        processing_status: processingStatus,
        error_message: errorMessage,
      });
    } catch (_) { /* swallow log errors */ }
  }
});
