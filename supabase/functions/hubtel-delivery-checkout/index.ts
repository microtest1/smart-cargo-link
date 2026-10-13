import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const safeHeader = (headers: Headers, name: string) => headers.get(name) ?? undefined;

interface DeliveryCheckoutRequest {
  deliveryRequestId: string;
  amount: number;
  description: string;
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl: string;
  cancellationUrl: string;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Parse request body
    const body: DeliveryCheckoutRequest = await req.json();
    const { deliveryRequestId, description, customerPhone, customerEmail, customerName, returnUrl, cancellationUrl } = body;

    // Validate required fields (amount is now derived server-side from delivery_requests)
    if (!deliveryRequestId || !customerPhone || !returnUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: deliveryRequestId, customerPhone, returnUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Verify the delivery request exists and belongs to the user
    const { data: deliveryRequest, error: deliveryError } = await supabase
      .from("delivery_requests")
      .select("*, shipments:shipment_id (tracking_number)")
      .eq("id", deliveryRequestId)
      .eq("user_id", userId)
      .single();

    if (deliveryError || !deliveryRequest) {
      console.error("Delivery request lookup error:", deliveryError);
      return new Response(
        JSON.stringify({ error: "Delivery request not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if delivery is already paid
    if (deliveryRequest.payment_status === "paid") {
      return new Response(
        JSON.stringify({ error: "Delivery is already paid", alreadyPaid: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SECURITY FIX: Use server-side delivery cost, never trust client-supplied amount ---
    const amount = Number(deliveryRequest.delivery_cost) || Number(deliveryRequest.amount);
    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      return new Response(
        JSON.stringify({ error: "Delivery request has no valid cost. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique client reference (max 32 characters as per Hubtel API)
    const timestamp = Date.now().toString(36).toUpperCase();
    const clientReference = `DEL-${deliveryRequest.user_code.substring(0, 10)}-${timestamp}`.substring(0, 32);

    // Format phone number for Hubtel (remove spaces and +)
    const formattedPhone = customerPhone.replace(/\s/g, "").replace("+", "");

    // Build callback URL - Hubtel will call this after payment
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubtel-delivery-callback`;

    // Prepare Hubtel checkout request payload
    const hubtelPayload = {
      totalAmount: parseFloat(amount.toFixed(2)),
      description: description || `Delivery Payment for ${deliveryRequest.shipments?.tracking_number || "Shipment"}`,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
      cancellationUrl: cancellationUrl || returnUrl,
      merchantAccountNumber: hubtelMerchantId,
      clientReference: clientReference,
      ...(formattedPhone && { customerMobileNumber: formattedPhone }),
      ...(customerEmail && { customerEmail: customerEmail }),
      ...(customerName && { payeeName: customerName }),
    };

    console.log("Creating Hubtel delivery checkout:", {
      deliveryRequestId,
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

    // If Hubtel rejected our Basic Auth, surface a clear error.
    // (This is the most common reason for 401 with empty body.)
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

    // If Hubtel returned a non-2xx status, return a provider error (with sanitized details)
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

    // Handle empty response
    if (!responseText || responseText.trim() === "") {
      console.error("Hubtel returned empty response");
      return new Response(
        JSON.stringify({ 
          error: "Payment provider returned empty response. Please try again.",
          details: `HTTP Status: ${hubtelResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON safely
    let hubtelData;
    try {
      hubtelData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Hubtel response:", parseError, "Response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Invalid response from payment provider",
          details: "Could not parse payment gateway response",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Update delivery request with payment reference (use server-side amount)
    const { error: updateError } = await supabase
      .from("delivery_requests")
      .update({
        payment_status: "processing",
        notes: `${deliveryRequest.notes || ""} | Hubtel Ref: ${clientReference}`,
      })
      .eq("id", deliveryRequestId);

    if (updateError) {
      console.error("Error updating delivery request:", updateError);
    }

    console.log("Hubtel delivery checkout created successfully:", {
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
    console.error("Hubtel delivery checkout error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
