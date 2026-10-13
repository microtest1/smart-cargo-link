import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface HubtelCallback {
  ResponseCode: string;
  Status: string;
  Data: {
    CheckoutId: string;
    SalesInvoiceId: string;
    ClientReference: string;
    Amount: number;
    AmountAfterCharges: number;
    PaymentDetails: {
      PaymentType: string;
      MobileNumber?: string;
      Channel?: string;
    };
    TransactionId: string;
    Description: string;
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
  
  // Timing-safe comparison
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
    
    console.log("Hubtel callback received");

    const { ResponseCode, Status, Data } = callbackData;
    
    if (!Data || !Data.ClientReference) {
      console.error("Invalid callback data - missing ClientReference");
      return new Response(
        JSON.stringify({ error: "Invalid callback data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { ClientReference, TransactionId, Amount, CheckoutId, PaymentDetails } = Data;

    const { data: payment, error: findError } = await supabase
      .from("payment_confirmations")
      .select("*, invoices:invoice_id (*)")
      .eq("transaction_id", ClientReference)
      .single();

    if (findError || !payment) {
      console.error("Payment not found for reference:", ClientReference);
      return new Response(
        JSON.stringify({ error: "Payment reference not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prevent duplicate processing
    if (payment.status === "verified") {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed", status: "verified" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches
    if (Math.abs(Amount - payment.amount) > 0.01) {
      console.error("Amount mismatch:", { expected: payment.amount, received: Amount });
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const isSuccessful = ResponseCode === "0000" && Status === "Success";
    const newStatus = isSuccessful ? "verified" : "rejected";

    // Update payment confirmation
    const { error: updatePaymentError } = await supabase
      .from("payment_confirmations")
      .update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        hubtel_reference: CheckoutId || TransactionId,
        notes: `Hubtel ${Status}. Transaction: ${TransactionId}. Method: ${PaymentDetails?.PaymentType || "Unknown"}. Channel: ${PaymentDetails?.Channel || "N/A"}. Amount: GH₵${Amount}`,
      })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Error updating payment:", updatePaymentError);
    }

    if (isSuccessful) {
      // Record payment (supports partial payments). Function returns new status.
      let recordedStatus: string | null = null;
      let newPaid = 0;
      let invoiceTotal = 0;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("record_invoice_payment", {
          p_invoice_id: payment.invoice_id,
          p_amount: Amount,
        });
        if (rpcError) throw rpcError;
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        recordedStatus = row?.new_status ?? null;
        newPaid = Number(row?.amount_paid ?? 0);
        invoiceTotal = Number(row?.total_amount ?? 0);
      } catch (e) {
        console.error("record_invoice_payment failed:", e);
      }

      const isFullyPaid = recordedStatus === "paid";
      const remaining = Math.max(0, invoiceTotal - newPaid);

      try {
        const invoiceData = payment.invoices as any;
        await supabase.from("notifications").insert({
          user_id: payment.user_id,
          user_code: payment.user_code,
          type: "payment",
          title: isFullyPaid ? "Payment Successful! ✅" : "Partial Payment Received 💰",
          message: isFullyPaid
            ? `Your payment of GH₵${Amount.toFixed(2)} for invoice ${invoiceData?.invoice_number || payment.invoice_id} has been confirmed. Thank you!`
            : `We received GH₵${Amount.toFixed(2)} for invoice ${invoiceData?.invoice_number || payment.invoice_id}. Outstanding balance: GH₵${remaining.toFixed(2)}.`,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }
    } else {
      try {
        await supabase.from("notifications").insert({
          user_id: payment.user_id,
          user_code: payment.user_code,
          type: "payment",
          title: "Payment Failed",
          message: `Your payment attempt for invoice ${payment.invoices?.invoice_number || payment.invoice_id} was not successful. Please try again.`,
        });
      } catch (notifError) {
        console.error("Error creating failure notification:", notifError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        message: isSuccessful ? "Payment verified and invoice updated" : "Payment failed" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Hubtel callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
