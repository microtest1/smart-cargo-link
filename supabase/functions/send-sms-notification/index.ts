import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-company-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SMSRequest {
  to: string;
  message: string;
  type?: "delivery_requested" | "payment_received" | "delivery_completed" | "general";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Company admins authenticate with a custom session token instead of a Supabase JWT.
    const companyToken = req.headers.get("x-company-token");
    let authorized = false;

    if (companyToken) {
      const { data: sessionData } = await supabase.rpc("verify_company_session", {
        p_token: companyToken,
      });
      authorized = Array.isArray(sessionData)
        ? sessionData[0]?.valid === true
        : (sessionData as any)?.valid === true;
      if (!authorized) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const token = authHeader.replace("Bearer ", "");
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user has admin or manager role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .in("role", ["admin", "manager"]);

      if (!roles || roles.length === 0) {
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    // Parse request body
    const body: SMSRequest = await req.json();
    const { to, type = "general" } = body;

    // Validate required fields
    if (!to || !body.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (digits, +, spaces only, max 20 chars)
    if (!/^[0-9+\s]{7,20}$/.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit message length (SMS max is ~160 chars per segment, allow up to 640 for multi-part)
    const message = typeof body.message === "string" ? body.message.substring(0, 640) : "";

    // Get Hubtel SMS credentials
    const clientId = Deno.env.get("HUBTEL_SMS_CLIENT_ID");
    const clientSecret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Hubtel SMS credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove spaces and ensure proper format)
    let formattedPhone = to.replace(/\s/g, "").replace("+", "");
    // Ensure Ghana numbers start with 233
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "233" + formattedPhone.substring(1);
    }

    // Sender ID (SMS head). Hubtel alphanumeric sender IDs must be pre-registered.
    // Primary: full company branding. Fallback: the legacy registered "Amoliga" sender.
    const primarySender = (Deno.env.get("HUBTEL_SMS_SENDER_ID") || "Amoliga Elite Freight & Logistics").trim();
    const senderCandidates = [primarySender, "Amoliga Elite", "Amoliga"].filter(
      (v, i, arr) => v && arr.indexOf(v) === i,
    );

    const sendWith = async (from: string) => {
      const smsUrl = new URL("https://sms.hubtel.com/v1/messages/send");
      smsUrl.searchParams.set("clientid", clientId);
      smsUrl.searchParams.set("clientsecret", clientSecret);
      smsUrl.searchParams.set("from", from);
      smsUrl.searchParams.set("to", formattedPhone);
      smsUrl.searchParams.set("content", message);
      const res = await fetch(smsUrl.toString(), { method: "GET" });
      const text = await res.text();
      console.log(`Hubtel SMS (from=${from}) status:`, res.status, text.substring(0, 300));
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* non-JSON */ }
      return { res, text, json };
    };

    console.log("Sending SMS to:", formattedPhone, "Type:", type);

    let attempt = await sendWith(senderCandidates[0]);
    // Retry down the sender list if the sender ID itself was rejected
    for (let i = 1; i < senderCandidates.length; i++) {
      if (attempt.json && attempt.json.status === 0) break;
      console.warn(`Sender ID "${senderCandidates[i - 1]}" rejected, retrying with "${senderCandidates[i]}"`);
      attempt = await sendWith(senderCandidates[i]);
    }

    const responseText = attempt.text;
    const smsData = attempt.json;
    if (!smsData) {
      console.error("Failed to parse SMS response:", responseText);
      return new Response(
        JSON.stringify({ error: "Invalid response from SMS provider" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Check for success (status 0 means success in Hubtel API)
    if (smsData.status !== 0) {
      console.error("SMS send failed:", smsData);
      return new Response(
        JSON.stringify({ 
          error: "SMS send failed", 
          details: smsData.statusDescription || "Unknown error" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SMS sent successfully:", {
      messageId: smsData.messageId,
      to: formattedPhone,
      rate: smsData.rate,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: smsData.messageId,
        rate: smsData.rate,
        statusDescription: smsData.statusDescription,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("SMS notification error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
