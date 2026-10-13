import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusRequest {
  invoiceId?: string;
  clientReference?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: StatusRequest = await req.json();
    const { invoiceId, clientReference } = body;

    if (!invoiceId && !clientReference) {
      return new Response(
        JSON.stringify({ error: "Missing invoiceId or clientReference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, check our database for the payment status
    let query = supabase
      .from("payment_confirmations")
      .select("*, invoices:invoice_id (id, invoice_number, status, total_amount)")
      .eq("user_id", userId)
      .eq("payment_provider", "hubtel");

    if (clientReference) {
      query = query.eq("transaction_id", clientReference);
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }

    const { data: payment, error: paymentError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ 
          error: "Payment not found", 
          status: "not_found" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payment is already verified or rejected, return that status
    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({
          success: true,
          status: payment.status,
          invoiceStatus: payment.invoices?.status,
          amount: payment.amount,
          hubtelReference: payment.hubtel_reference,
          verifiedAt: payment.verified_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payment is still pending, check with Hubtel API
    const hubtelApiId = Deno.env.get("HUBTEL_API_ID");
    const hubtelApiKey = Deno.env.get("HUBTEL_API_KEY");
    const hubtelMerchantId = Deno.env.get("HUBTEL_MERCHANT_ID");

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantId) {
      // Return current status if we can't check with Hubtel
      return new Response(
        JSON.stringify({
          success: true,
          status: payment.status,
          invoiceStatus: payment.invoices?.status,
          amount: payment.amount,
          message: "Waiting for payment confirmation",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status with Hubtel Transaction Status API
    const hubtelAuth = btoa(`${hubtelApiId}:${hubtelApiKey}`);
    const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${hubtelMerchantId}/status?clientReference=${payment.transaction_id}`;

    console.log("Checking Hubtel transaction status:", {
      clientReference: payment.transaction_id,
      merchantId: hubtelMerchantId,
    });

    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${hubtelAuth}`,
      },
    });

    const statusData = await statusResponse.json();

    console.log("Hubtel status response:", statusData);

    // Process Hubtel status response
    if (statusResponse.ok && statusData.responseCode === "0000") {
      const transactionStatus = statusData.data?.status || statusData.data?.transactionStatus;
      
      // Map Hubtel status to our status
      let newStatus = payment.status;
      if (transactionStatus === "Success" || transactionStatus === "Successful") {
        newStatus = "verified";
      } else if (transactionStatus === "Failed" || transactionStatus === "Cancelled") {
        newStatus = "rejected";
      }

      // Update payment if status changed
      if (newStatus !== payment.status) {
        const serviceSupabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        await serviceSupabase
          .from("payment_confirmations")
          .update({
            status: newStatus,
            verified_at: newStatus === "verified" ? new Date().toISOString() : null,
            notes: `Status check: ${transactionStatus}. ${payment.notes || ""}`,
          })
          .eq("id", payment.id);

        // Update invoice if verified
        if (newStatus === "verified") {
          await serviceSupabase
            .from("invoices")
            .update({ status: "paid" })
            .eq("id", payment.invoice_id);

          // Send notification
          await serviceSupabase.from("notifications").insert({
            user_id: payment.user_id,
            user_code: payment.user_code,
            type: "payment",
            title: "Payment Confirmed! ✅",
            message: `Your payment has been verified. Invoice ${payment.invoices?.invoice_number} is now marked as paid.`,
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: newStatus,
            invoiceStatus: newStatus === "verified" ? "paid" : payment.invoices?.status,
            amount: payment.amount,
            hubtelStatus: transactionStatus,
            updated: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return current status
    return new Response(
      JSON.stringify({
        success: true,
        status: payment.status,
        invoiceStatus: payment.invoices?.status,
        amount: payment.amount,
        message: "Payment is being processed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Hubtel status check error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
