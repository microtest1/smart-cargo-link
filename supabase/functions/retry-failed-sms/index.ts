import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendSMS(
  phone: string,
  message: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let formattedPhone = phone.replace(/\s/g, "").replace("+", "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "233" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("233")) {
      formattedPhone = "233" + formattedPhone;
    }

    const smsUrl = new URL("https://sms.hubtel.com/v1/messages/send");
    smsUrl.searchParams.set("clientid", clientId);
    smsUrl.searchParams.set("clientsecret", clientSecret);
    smsUrl.searchParams.set("from", "Amoliga");
    smsUrl.searchParams.set("to", formattedPhone);
    smsUrl.searchParams.set("content", message);

    console.log("Sending SMS to:", formattedPhone);

    const smsResponse = await fetch(smsUrl.toString(), { method: "GET" });
    const smsData = await smsResponse.json();

    if (smsData.status === 0) {
      return { success: true, messageId: smsData.messageId };
    }
    return { success: false, error: smsData.statusDescription || "SMS failed" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "SMS error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization check - require admin or manager role
    const { data: roles } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "manager"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get failed SMS submissions from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: failedSubmissions, error: queryError } = await supabase
      .from("warehouse_submissions")
      .select(`
        id,
        tracking_number,
        product_name,
        customer_user_code,
        sms_error,
        status
      `)
      .eq("sms_sent", false)
      .not("sms_error", "is", null)
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: true })
      .limit(50);

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    console.log(`Found ${failedSubmissions?.length || 0} failed SMS to retry`);

    if (!failedSubmissions || failedSubmissions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No failed SMS to retry", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("HUBTEL_SMS_CLIENT_ID");
    const clientSecret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "SMS credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ id: string; status: string; error?: string }>,
    };

    for (const submission of failedSubmissions) {
      try {
        // Get customer phone from profile
        if (!submission.customer_user_code) {
          results.skipped++;
          results.details.push({ id: submission.id, status: "skipped", error: "No customer code" });
          continue;
        }

        const trackingCodeFromSheet = submission.customer_user_code?.trim();
        if (!trackingCodeFromSheet) {
          results.skipped++;
          results.details.push({ id: submission.id, status: "skipped", error: "Missing tracking/customer code" });
          continue;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("unique_code", trackingCodeFromSheet)
          .maybeSingle();

        if (!profile?.phone) {
          results.skipped++;
          results.details.push({ id: submission.id, status: "skipped", error: "No phone number" });
          continue;
        }

        const smsMessage = `Hello ${profile.full_name || "Valued Customer"}, your goods have been received and packed at our China warehouse.\n\nYou can track your shipment using this code:\n\n${trackingCodeFromSheet}\n\nVisit https://amoligaelitefreight.com\n\nCreate an account or enter your code to:\n• Track your goods\n• View shipment updates\n• Request delivery when available\n\nAmoliga Elite Freight & Logistics\n\nPowered by Asesawa Cauchere.`;

        const result = await sendSMS(profile.phone, smsMessage, clientId, clientSecret);

        if (result.success) {
          await supabase
            .from("warehouse_submissions")
            .update({
              sms_sent: true,
              sms_sent_at: new Date().toISOString(),
              sms_error: null,
            })
            .eq("id", submission.id);

          results.success++;
          results.details.push({ id: submission.id, status: "sent" });
        } else {
          await supabase
            .from("warehouse_submissions")
            .update({
              sms_error: `Retry failed: ${result.error}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", submission.id);

          results.failed++;
          results.details.push({ id: submission.id, status: "failed", error: result.error });
        }

        // Small delay between SMS to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error processing submission ${submission.id}:`, err);
        results.failed++;
        results.details.push({ 
          id: submission.id, 
          status: "error", 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    console.log("Retry results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS retry completed",
        processed: failedSubmissions.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Retry function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
