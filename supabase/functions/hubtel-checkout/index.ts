import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const safeHeader = (headers: Headers, name: string) => headers.get(name) ?? undefined;

interface CheckoutRequest {
  invoiceId: string;
  amount: number;
  description: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl: string;
  cancellationUrl?: string;
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { invoiceId, returnUrl, cancellationUrl } = body;

    // Validate required fields (amount is derived / clamped server-side)
    if (!invoiceId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoiceId, returnUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize optional string fields
    const description = typeof body.description === "string" ? body.description.substring(0, 200).replace(/[<>]/g, "") : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.substring(0, 20).replace(/[^0-9+\s]/g, "") : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.substring(0, 254) : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.substring(0, 100).replace(/[<>]/g, "") : "";

    // Get Hubtel credentials from secrets (trim to avoid hidden whitespace issues)
    const hubtelApiId = Deno.env.get("HUBTEL_API_ID")?.trim();
    const hubtelApiKey = Deno.env.get("HUBTEL_API_KEY")?.trim();
    const hubtelMerchantId = Deno.env.get("HUBTEL_MERCHANT_ID")?.trim();

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantId) {
      console.error("Hubtel credentials not configured:", {
        hasApiId: !!hubtelApiId,
        hasApiKey: !!hubtelApiKey,
        hasMerchantId: !!hubtelMerchantId,
      });
      return new Response(
        JSON.stringify({ error: "Payment service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Hubtel credentials validated successfully");

    // Verify the invoice exists and belongs to the user
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, shipments:shipment_id (tracking_number)")
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice lookup error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invoice is already fully paid
    if (invoice.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Invoice is already paid", alreadyPaid: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SECURITY: server-side outstanding balance ---
    const total = Number(invoice.total_amount);
    const alreadyPaid = Number(invoice.amount_paid || 0);
    const outstanding = Math.max(0, total - alreadyPaid);

    if (!Number.isFinite(total) || total <= 0 || outstanding <= 0) {
      return new Response(
        JSON.stringify({ error: "Invoice has no outstanding balance." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client may request a partial amount; clamp to (0, outstanding]. Fall back to outstanding.
    const rawRequested = Number((body as any).amount);
    let amount = Number.isFinite(rawRequested) && rawRequested > 0 ? rawRequested : outstanding;
    if (amount > outstanding + 0.001) amount = outstanding;
    if (amount < 0.01) {
      return new Response(
        JSON.stringify({ error: "Payment amount is too small." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    amount = Math.round(amount * 100) / 100;

    // Check for existing pending payment
    const { data: existingPayment } = await supabase
      .from("payment_confirmations")
      .select("*")
      .eq("invoice_id", invoiceId)
      .eq("status", "pending")
      .eq("payment_provider", "hubtel")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's a recent pending payment (within 10 minutes), return that checkout URL
    if (existingPayment) {
      const createdAt = new Date(existingPayment.created_at).getTime();
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      
      if (createdAt > tenMinutesAgo && existingPayment.notes?.includes("checkoutUrl:")) {
        const urlMatch = existingPayment.notes.match(/checkoutUrl: (https:\/\/[^\s]+)/);
        if (urlMatch?.[1]) {
          console.log("Returning existing checkout URL for invoice:", invoiceId);
          return new Response(
            JSON.stringify({
              success: true,
              checkoutUrl: urlMatch[1],
              clientReference: existingPayment.transaction_id,
              existingSession: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Generate unique client reference (max 32 characters as per Hubtel API)
    const timestamp = Date.now().toString(36).toUpperCase();
    const clientReference = `${invoice.invoice_number.substring(0, 20)}-${timestamp}`.substring(0, 32);

    // Format phone number for Hubtel (remove spaces and +)
    const formattedPhone = (customerPhone || "").replace(/\s/g, "").replace("+", "");

    // Build callback URL - Hubtel will call this after payment
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubtel-callback`;

    // Prepare Hubtel checkout request payload
    const hubtelPayload = {
      totalAmount: parseFloat(amount.toFixed(2)),
      description: description || `Payment for Invoice ${invoice.invoice_number}`,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
      cancellationUrl: cancellationUrl || returnUrl,
      merchantAccountNumber: hubtelMerchantId,
      clientReference: clientReference,
      ...(formattedPhone && { customerMobileNumber: formattedPhone }),
      ...(customerEmail && { customerEmail: customerEmail }),
      ...(customerName && { payeeName: customerName }),
    };

    console.log("Creating Hubtel checkout:", {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      amount: hubtelPayload.totalAmount,
      clientReference,
      customerPhone: formattedPhone,
    });

    // Create Basic Auth header for Hubtel (API ID:API Key)
    const hubtelAuth = btoa(`${hubtelApiId}:${hubtelApiKey}`);

    // Call Hubtel Online Checkout API
    const hubtelResponse = await fetch(
      "https://payproxyapi.hubtel.com/items/initiate",
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${hubtelAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hubtelPayload),
      }
    );

    console.log("Hubtel API response status:", hubtelResponse.status);

    // Always consume response body as text for robust handling/logging
    const responseText = await hubtelResponse.text();
    const responseSnippet = (responseText || "").substring(0, 800);

    console.log("Hubtel API response headers:", {
      contentType: safeHeader(hubtelResponse.headers, "content-type"),
      contentLength: safeHeader(hubtelResponse.headers, "content-length"),
      requestId:
        safeHeader(hubtelResponse.headers, "x-request-id") ||
        safeHeader(hubtelResponse.headers, "x-correlation-id"),
      wwwAuthenticate: safeHeader(hubtelResponse.headers, "www-authenticate"),
    });

    console.log("Hubtel API response text (snippet):", responseSnippet);

    if (hubtelResponse.status === 401) {
      console.error("Hubtel authentication failed (401). Check HUBTEL_API_ID/HUBTEL_API_KEY.");
      return new Response(
        JSON.stringify({
          error: "Payment service authentication failed",
          details:
            "The payment provider rejected the configured credentials. Please verify HUBTEL_API_ID and HUBTEL_API_KEY.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!hubtelResponse.ok) {
      console.error("Hubtel returned non-success status", {
        status: hubtelResponse.status,
        responseSnippet,
      });
      return new Response(
        JSON.stringify({
          error: "Payment provider error",
          details: `Hubtel returned HTTP ${hubtelResponse.status}. Please try again.`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!responseText || responseText.trim() === "") {
      console.error("Hubtel returned empty response");
      return new Response(
        JSON.stringify({
          error: "Payment provider returned empty response. Please try again.",
          details: `HTTP Status: ${hubtelResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let hubtelData: any;
    try {
      hubtelData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Hubtel response:", parseError, "Response:", responseText);
      return new Response(
        JSON.stringify({
          error: "Invalid response from payment provider",
          details: "Could not parse payment gateway response",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Hubtel API response parsed:", {
      status: hubtelResponse.status,
      responseCode: hubtelData.responseCode,
      message: hubtelData.message,
    });

    // Check for successful response
    if (hubtelData.responseCode !== "0000") {
      console.error("Hubtel checkout failed:", hubtelData);
      return new Response(
        JSON.stringify({ 
          error: "Payment initialization failed", 
          details: hubtelData.message || hubtelData.data?.message || "Unknown error from payment provider",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = hubtelData.data?.checkoutUrl;
    const checkoutId = hubtelData.data?.checkoutId;

    if (!checkoutUrl) {
      console.error("No checkout URL in Hubtel response:", hubtelData);
      return new Response(
        JSON.stringify({ error: "Payment provider did not return checkout URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store pending payment reference - BOUND TO CONTAINER
    const { error: paymentError } = await supabase
      .from("payment_confirmations")
      .insert({
        invoice_id: invoiceId,
        user_id: userId,
        user_code: invoice.user_code,
        transaction_id: clientReference,
        payment_method: "hubtel_checkout",
        amount: amount,
        status: "pending",
        payment_provider: "hubtel",
        hubtel_reference: checkoutId || clientReference,
        container_id: invoice.container_id,
        notes: `Hubtel checkout initiated. checkoutUrl: ${checkoutUrl}. Checkout ID: ${checkoutId}`,
      });

    if (paymentError) {
      console.error("Error storing payment reference:", paymentError);
      // Don't fail the request, just log
    }

    console.log("Hubtel checkout created successfully:", {
      checkoutUrl,
      checkoutId,
      clientReference,
    });

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkoutUrl,
        checkoutDirectUrl: hubtelData.data?.checkoutDirectUrl,
        checkoutId: checkoutId,
        clientReference: clientReference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Hubtel checkout error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
