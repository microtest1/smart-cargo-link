// Hubtel Programmable Services — Fulfillment endpoint
// Called server-to-server by Hubtel after a successful USSD payment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

function mask(m: string | undefined | null): string | null {
  if (!m) return null;
  const s = String(m);
  if (s.length < 5) return "***";
  return s.slice(0, 3) + "****" + s.slice(-2);
}

function safeJson(input: string): any {
  try { return JSON.parse(input); } catch { return null; }
}

async function verifyHmac(body: string, sig: string | null, secret: string): Promise<boolean> {
  if (!sig) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const computed = Array.from(new Uint8Array(s)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (computed.length !== sig.length) return false;
  let r = 0;
  for (let i = 0; i < computed.length; i++) r |= computed.charCodeAt(i) ^ sig.charCodeAt(i);
  return r === 0;
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

    // Verify caller is Hubtel (fail-closed). Hubtel Programmable Services calls the
    // fulfillment URL with HTTP Basic Auth (API ID / API Key). Some setups instead sign
    // the body with a shared secret, so both mechanisms are accepted.
    const webhookSecret = Deno.env.get("HUBTEL_WEBHOOK_SECRET");
    const apiId = Deno.env.get("HUBTEL_API_ID");
    const apiKey = Deno.env.get("HUBTEL_API_KEY");
    if (!webhookSecret && !(apiId && apiKey)) {
      processingStatus = "error"; errorMessage = "fulfillment credentials missing"; httpStatus = 500;
      responseBody = { ResponseCode: "2001", ServiceStatus: "failed", Message: "Server misconfigured" };
      return new Response(JSON.stringify(responseBody), { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    let basicOk = false;
    if (apiId && apiKey && authHeader.toLowerCase().startsWith("basic ")) {
      try {
        const decoded = atob(authHeader.slice(6).trim());
        const expected = `${apiId}:${apiKey}`;
        basicOk = decoded.length === expected.length &&
          decoded.split("").reduce((r, c, i) => r | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0;
      } catch { basicOk = false; }
    }

    const sig = req.headers.get("x-hubtel-signature") || req.headers.get("x-webhook-signature");
    const hmacOk = webhookSecret ? await verifyHmac(raw, sig, webhookSecret) : false;

    if (!basicOk && !hmacOk) {
      processingStatus = "unauthorized"; errorMessage = "invalid credentials"; httpStatus = 401;
      responseBody = { ResponseCode: "2001", ServiceStatus: "failed", Message: "Unauthorized" };
      return new Response(JSON.stringify(responseBody), { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    payload = safeJson(raw) ?? {};

    sessionId = payload.SessionId ?? payload.sessionId ?? null;
    mobile = payload.Mobile ?? payload.mobile ?? null;
    const clientReference: string | null =
      payload.ClientReference ?? payload.clientReference ?? payload.OrderInfo?.ClientReference ?? null;
    const hubtelTxId: string | null =
      payload.TransactionId ?? payload.transactionId ?? payload.OrderId ?? null;
    const status: string = (payload.Status ?? payload.status ?? "success").toString().toLowerCase();
    const amount = Number(payload.Amount ?? payload.amount ?? 0);

    if (!clientReference) {
      responseBody = { ResponseCode: "2001", Message: "ClientReference is required" };
      httpStatus = 400; processingStatus = "invalid_request";
      return new Response(JSON.stringify(responseBody), {
        status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent lookup
    const { data: existing } = await supabase.from("hubtel_ussd_fulfillments")
      .select("*").eq("client_reference", clientReference).maybeSingle();

    if (existing && (existing.status === "paid" || existing.status === "fulfilled")) {
      responseBody = {
        SessionId: sessionId ?? existing.session_id,
        OrderId: hubtelTxId ?? existing.hubtel_transaction_id ?? clientReference,
        ServiceStatus: "success",
        ResponseCode: "0000",
        Message: "Already fulfilled",
        Label: "Fulfilled",
      };
      return new Response(JSON.stringify(responseBody), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update fulfillment row (create if missing to remain robust)
    const record = existing ?? { invoice_id: null, delivery_request_id: null };
    const isSuccess = status === "success" || status === "paid" || status === "0000";

    if (existing) {
      await supabase.from("hubtel_ussd_fulfillments").update({
        status: isSuccess ? "paid" : "failed",
        hubtel_transaction_id: hubtelTxId,
        raw_response: payload,
        updated_at: new Date().toISOString(),
      }).eq("client_reference", clientReference);
    } else {
      await supabase.from("hubtel_ussd_fulfillments").insert({
        client_reference: clientReference,
        session_id: sessionId,
        mobile: mobile,
        amount: amount,
        status: isSuccess ? "paid" : "failed",
        hubtel_transaction_id: hubtelTxId,
        raw_request: payload,
      });
    }

    if (isSuccess) {
      if (record.invoice_id) {
        // Route through the shared ledger so partial payments stay consistent
        // with the web/Hubtel checkout flow (amount_paid + paid/partially_paid).
        try {
          const { error: rpcError } = await supabase.rpc("record_invoice_payment", {
            p_invoice_id: record.invoice_id,
            p_amount: amount,
          });
          if (rpcError) throw rpcError;
        } catch (e) {
          console.error("record_invoice_payment failed:", e instanceof Error ? e.message : e);
          await supabase.from("invoices").update({ status: "paid" }).eq("id", record.invoice_id);
        }
      }
      if (record.delivery_request_id) {
        await supabase.from("delivery_requests").update({ payment_status: "paid" }).eq("id", record.delivery_request_id);
      }
    }


    responseBody = {
      SessionId: sessionId ?? "",
      OrderId: hubtelTxId ?? clientReference,
      ServiceStatus: isSuccess ? "success" : "failed",
      ResponseCode: isSuccess ? "0000" : "2001",
      Message: isSuccess ? "Fulfillment completed" : "Payment not successful",
      Label: "Amoliga Elite Freight",
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    processingStatus = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    responseBody = {
      SessionId: sessionId ?? "",
      ResponseCode: "2001",
      ServiceStatus: "failed",
      Message: "Internal error processing fulfillment",
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try {
      await supabase.from("hubtel_ussd_logs").insert({
        endpoint_type: "fulfillment",
        session_id: sessionId,
        mobile_number_masked: mask(mobile),
        request_payload: payload ?? { raw },
        response_payload: responseBody,
        http_status: httpStatus,
        processing_status: processingStatus,
        error_message: errorMessage,
      });
    } catch (_) { /* ignore */ }
  }
});
