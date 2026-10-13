import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface HubtelCallback {
  ResponseCode: string;
  Status: string;
  Data: {
    Amount: number;
    AmountAfterCharges: number;
    AmountCharged: number;
    CheckoutId: string;
    ClientReference: string;
    CustomerPhoneNumber: string;
    Description: string;
    ExternalTransactionId: string;
    Fee: number;
    PaymentDetails: {
      MobileNumber?: string;
      PaymentType?: string;
      Channel?: string;
    };
    SalesInvoiceId: string;
    TransactionId: string;
  };
}

async function verifyHmacSignature(body: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (computed.length !== signatureHeader.length) return false;
  const a = encoder.encode(computed);
  const b = encoder.encode(signatureHeader);
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("Received Hubtel delivery callback");

  try {
    // Read body as text for signature verification
    const bodyText = await req.text();

    // Verify webhook signature
    const webhookSecret = Deno.env.get("HUBTEL_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("HUBTEL_WEBHOOK_SECRET not configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const signature = req.headers.get("x-hubtel-signature") || req.headers.get("x-webhook-signature");
    const isValid = await verifyHmacSignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callbackData: HubtelCallback = JSON.parse(bodyText);
    
    const clientReference = callbackData.Data?.ClientReference;
    
    if (!clientReference) {
      console.error("No client reference in callback");
      return new Response(
        JSON.stringify({ error: "Missing client reference" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!clientReference.startsWith("DEL-")) {
      return new Response(
        JSON.stringify({ success: true, message: "Not a delivery payment" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: deliveryRequests, error: findError } = await supabase
      .from("delivery_requests")
      .select("*")
      .ilike("notes", `%${clientReference}%`);

    if (findError || !deliveryRequests || deliveryRequests.length === 0) {
      console.error("Delivery request not found for reference:", clientReference);
      return new Response(
        JSON.stringify({ error: "Delivery request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const deliveryRequest = deliveryRequests[0];
    const isSuccess = callbackData.ResponseCode === "0000" && callbackData.Status === "Success";

    // Verify amount matches if delivery request has an amount
    if (deliveryRequest.amount && Math.abs(callbackData.Data?.Amount - deliveryRequest.amount) > 0.01) {
      console.error("Amount mismatch:", { expected: deliveryRequest.amount, received: callbackData.Data?.Amount });
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("delivery_requests")
      .update({
        payment_status: isSuccess ? "paid" : "failed",
        status: isSuccess ? "confirmed" : "payment_failed",
        notes: `${deliveryRequest.notes} | Payment ${isSuccess ? "Confirmed" : "Failed"}: ${callbackData.Data?.TransactionId || "N/A"}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryRequest.id);

    if (updateError) {
      console.error("Error updating delivery request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update delivery request" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isSuccess) {
      await supabase.from("notifications").insert({
        user_id: deliveryRequest.user_id,
        user_code: deliveryRequest.user_code,
        title: "Delivery Payment Confirmed",
        message: `Your delivery payment of GHS ${callbackData.Data?.Amount?.toFixed(2)} has been confirmed. Your delivery will be processed shortly.`,
        type: "payment",
        read: false,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isSuccess ? "Payment confirmed" : "Payment failed",
        deliveryRequestId: deliveryRequest.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Hubtel delivery callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
