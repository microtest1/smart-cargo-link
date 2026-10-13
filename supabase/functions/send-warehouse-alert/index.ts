import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fetch alert recipients from environment (JSON array) or use defaults
function getAlertRecipients(): Array<{ name: string; phone: string }> {
  const recipientsJson = Deno.env.get("WAREHOUSE_ALERT_RECIPIENTS");
  if (recipientsJson) {
    try {
      return JSON.parse(recipientsJson);
    } catch {
      console.error("Failed to parse WAREHOUSE_ALERT_RECIPIENTS secret");
    }
  }
  // Fallback: return empty array if not configured
  console.error("WAREHOUSE_ALERT_RECIPIENTS secret not configured");
  return [];
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s+\-()]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "233" + cleaned.substring(1);
  }
  return cleaned;
}

interface AlertRequest {
  tracking_number: string;
  courier_name?: string;
  shipment_location?: string;
  alert_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authentication: only accept calls bearing the service-role key ---
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const providedToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!providedToken || providedToken !== supabaseServiceKey) {
      console.error("Unauthorized call to send-warehouse-alert");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (!supabaseUrl) {
      console.error("SUPABASE_URL not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AlertRequest = await req.json();

    // --- Input validation & length capping to prevent SMS content injection ---
    const sanitize = (val: unknown, maxLen: number, fallback: string): string => {
      if (typeof val !== "string" || val.trim().length === 0) return fallback;
      // Strip control characters and limit length
      return val.replace(/[\x00-\x1f\x7f]/g, "").trim().substring(0, maxLen);
    };

    const tracking_number = sanitize(body.tracking_number, 64, "");
    const courier_name = sanitize(body.courier_name, 100, "Unknown");
    const shipment_location = sanitize(body.shipment_location, 200, "Unknown");
    const alert_type = sanitize(body.alert_type, 50, "warehouse_proximity");

    if (!tracking_number) {
      return new Response(
        JSON.stringify({ error: "Missing tracking_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication: check if alert already sent for this tracking number + type
    const { data: existing } = await supabase
      .from("warehouse_alerts")
      .select("id, sms_status")
      .eq("tracking_number", tracking_number)
      .eq("alert_type", alert_type)
      .maybeSingle();

    if (existing && existing.sms_status === "sent") {
      console.log(`Alert already sent for ${tracking_number} (${alert_type}), skipping`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "Alert already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Build alert message
    const message = `AMOLIGA ELITE WAREHOUSE ALERT\n\nA new shipment has been detected heading to the China warehouse.\n\nTracking Code: ${tracking_number}\nCourier Service: ${courier_name}\nLatest Location: ${shipment_location}\n\nPlease verify warehouse receipt and update the system.\n\nPowered by Asesawa Cauchere`;

    // Fetch recipients at runtime
    const ALERT_RECIPIENTS = getAlertRecipients();
    if (ALERT_RECIPIENTS.length === 0) {
      return new Response(
        JSON.stringify({ error: "Alert recipients not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS to all recipients
    const smsResults: Array<{
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const recipient of ALERT_RECIPIENTS) {
      const formattedPhone = normalizePhone(recipient.phone);

      try {
        const smsUrl = new URL("https://sms.hubtel.com/v1/messages/send");
        smsUrl.searchParams.set("clientid", clientId);
        smsUrl.searchParams.set("clientsecret", clientSecret);
        smsUrl.searchParams.set("from", "Amoliga");
        smsUrl.searchParams.set("to", formattedPhone);
        smsUrl.searchParams.set("content", message);

        const smsResponse = await fetch(smsUrl.toString(), { method: "GET" });
        const responseText = await smsResponse.text();

        let smsData;
        try {
          smsData = JSON.parse(responseText);
        } catch {
          smsResults.push({
            name: recipient.name,
            phone: formattedPhone,
            success: false,
            error: "Invalid SMS response",
          });
          continue;
        }

        if (smsData.status === 0) {
          console.log(`Alert SMS sent to ${recipient.name}`);
          smsResults.push({
            name: recipient.name,
            success: true,
          });
        } else {
          console.error(`SMS failed for ${recipient.name}:`, smsData.statusDescription);
          smsResults.push({
            name: recipient.name,
            success: false,
            error: smsData.statusDescription || "Send failed",
          });
        }
      } catch (err) {
        console.error(`SMS error for ${recipient.name}:`, err);
        smsResults.push({
          name: recipient.name,
          success: false,
          error: "Network error",
        });
      }
    }

    const allSuccess = smsResults.every((r) => r.success);
    const anySuccess = smsResults.some((r) => r.success);
    const smsStatus = allSuccess ? "sent" : anySuccess ? "partial" : "failed";

    // Upsert alert log
    const { error: logError } = await supabase
      .from("warehouse_alerts")
      .upsert(
        {
          tracking_number,
          courier_name,
          shipment_location,
          alert_type,
          sms_recipients: ALERT_RECIPIENTS,
          sms_results: smsResults,
          sms_status: smsStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tracking_number,alert_type" }
      );

    if (logError) {
      console.error("Failed to log alert:", logError);
    }

    console.log(`Warehouse alert processed for ${tracking_number}: ${smsStatus}`);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        sms_status: smsStatus,
        sent_count: smsResults.filter((r) => r.success).length,
        total_recipients: smsResults.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Warehouse alert error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
