import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateFreightByCbm, formatGhs, getActiveCbmPricing } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FormSubmission {
  // Form fields (English or Chinese labels)
  customerName?: string;        // 客户全名
  customerPhone?: string;       // 客户电话号码 (from sheet directly)
  trackingNumber: string;       // 追踪号码
  containerName?: string;       // 集装箱名称 (label, not number)
  productName: string;          // 产品名称
  uniqueTrackingCode?: string;  // 唯一追踪码
  quantityReceived?: number;    // 收到货物数量
  lengthCm?: number;            // 长度 (cm)
  widthCm?: number;             // 宽度 (cm)
  heightCm?: number;            // 高度 (cm)
  shipmentStatus?: string;      // 货运状态
  dateReceived?: string;        // 在中国仓库收到的日期
  notes?: string;
  // Legacy fields for backward compatibility
  containerNumber?: string;
  containerId?: string;
  productDetails?: string;
  fulfillmentDate?: string;
  customerUserCode?: string;
}

// SMS retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s


/**
 * Validate and normalize a phone number to international format (233XXXXXXXXX).
 * Accepts: +233XXXXXXXXX, 233XXXXXXXXX, 0XXXXXXXXX, raw digits.
 * Returns null if invalid.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  if (!/^\d{7,15}$/.test(cleaned)) return null;
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    cleaned = "233" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("233") && cleaned.length <= 10) {
    cleaned = "233" + cleaned;
  }
  if (cleaned.startsWith("233") && cleaned.length !== 12) return null;
  return cleaned;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Map Chinese/English status to internal status
function normalizeStatus(status?: string): string {
  if (!status) return "received";
  
  const statusLower = status.toLowerCase().trim();
  
  const statusMap: Record<string, string> = {
    "received": "received",
    "received at china warehouse": "received",
    "packed": "packed",
    "packed in china warehouse": "packed",
    "left china": "left_china",
    "in transit": "in_transit",
    "in transit to ghana": "in_transit",
    "arrived": "arrived",
    "arrived at tema": "arrived",
    "arrived at tema warehouse": "arrived",
    "delivered": "delivered",
    "已收到": "received",
    "在中国仓库收到": "received",
    "已打包": "packed",
    "在中国仓库打包": "packed",
    "已离开中国": "left_china",
    "运输中": "in_transit",
    "运往加纳": "in_transit",
    "已到达": "arrived",
    "到达特马仓库": "arrived",
  };
  
  return statusMap[statusLower] || "received";
}

async function sendSMSWithRetry(
  phone: string,
  message: string,
  clientId: string,
  clientSecret: string,
  attempt = 1
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Format phone number
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

    console.log(`SMS attempt ${attempt}/${MAX_RETRY_ATTEMPTS} to: ${formattedPhone}`);

    const smsResponse = await fetch(smsUrl.toString(), { method: "GET" });
    const smsData = await smsResponse.json();

    if (smsData.status === 0) {
      console.log("SMS sent successfully:", smsData.messageId);
      return { success: true, messageId: smsData.messageId };
    } else {
      const error = smsData.statusDescription || "SMS send failed";
      console.error(`SMS attempt ${attempt} failed:`, error);

      // Retry if we haven't exceeded max attempts
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1] || 30000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return sendSMSWithRetry(phone, message, clientId, clientSecret, attempt + 1);
      }

      return { success: false, error };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "SMS error";
    console.error(`SMS attempt ${attempt} exception:`, error);

    // Retry on network errors
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAYS[attempt - 1] || 30000;
      console.log(`Retrying after error in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendSMSWithRetry(phone, message, clientId, clientSecret, attempt + 1);
    }

    return { success: false, error };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Strict webhook method enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Validate webhook secret
    const WEBHOOK_SECRET = Deno.env.get("GOOGLE_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret")?.trim() || "";

    if (!WEBHOOK_SECRET || !providedSecret || !timingSafeEqual(providedSecret, WEBHOOK_SECRET)) {
      console.error("Unauthorized webhook attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require request timestamp to prevent replay attacks (5 minute window)
    const timestampHeader = req.headers.get("x-webhook-timestamp")?.trim() || "";
    const requestTime = Number(timestampHeader);
    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;

    if (!timestampHeader || !Number.isFinite(requestTime) || Math.abs(now - requestTime) > fiveMinutesMs) {
      console.error("Webhook request timestamp missing or out of range");
      return new Response(
        JSON.stringify({ error: "Request expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: FormSubmission = await req.json();
    // Log only non-PII operational fields
    console.log("Received form submission:", JSON.stringify({
      trackingNumber: body.trackingNumber,
      productName: body.productName,
      containerName: body.containerName,
      shipmentStatus: body.shipmentStatus,
      quantityReceived: body.quantityReceived,
      dateReceived: body.dateReceived,
    }));

    // Input validation helper
    const sanitizeString = (val: unknown, maxLen: number): string => {
      if (typeof val !== "string") return "";
      return val.trim().substring(0, maxLen).replace(/[<>]/g, "");
    };

    const sanitizeNumber = (val: unknown, max: number): number => {
      const n = typeof val === "number" ? val : parseFloat(String(val || "0"));
      if (isNaN(n) || n < 0) return 0;
      return Math.min(n, max);
    };

    const customerName = sanitizeString(body.customerName, 200);
    const customerPhoneRaw = sanitizeString(body.customerPhone, 30);
    const trackingNumber = sanitizeString(body.trackingNumber, 100);
    const containerName = sanitizeString(body.containerName, 100);
    const productName = sanitizeString(body.productName, 500);
    const uniqueTrackingCode = sanitizeString(body.uniqueTrackingCode, 50);
    const quantityReceived = sanitizeNumber(body.quantityReceived, 100000);
    const lengthCm = sanitizeNumber(body.lengthCm, 10000);
    const widthCm = sanitizeNumber(body.widthCm, 10000);
    const heightCm = sanitizeNumber(body.heightCm, 10000);
    const shipmentStatus = sanitizeString(body.shipmentStatus, 100);
    const dateReceived = sanitizeString(body.dateReceived, 30);
    const notes = sanitizeString(body.notes || "", 1000);
    // Legacy fields
    const containerNumber = sanitizeString(body.containerNumber, 100);
    const containerId = sanitizeString(body.containerId, 50);
    const productDetails = sanitizeString(body.productDetails, 500);
    const fulfillmentDate = sanitizeString(body.fulfillmentDate, 30);
    const customerUserCode = sanitizeString(body.customerUserCode, 50);

    // Use tracking number or unique tracking code
    const effectiveTracking = trackingNumber || uniqueTrackingCode;

    // Validate required fields
    if (!effectiveTracking || !productName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: trackingNumber, productName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate submissions (same tracking number within 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: existing } = await supabase
      .from("warehouse_submissions")
      .select("id")
      .eq("tracking_number", effectiveTracking)
      .gte("created_at", oneMinuteAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("Duplicate submission detected, skipping:", effectiveTracking);
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate submission ignored", duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize status
    const normalizedStatus = normalizeStatus(shipmentStatus);
    console.log(`Status "${shipmentStatus}" normalized to "${normalizedStatus}"`);

    // Calculate CBM if dimensions provided
    let calculatedCbm = 0;
    let calculatedCbmCost = 0;
    const cbmPricing = await getActiveCbmPricing(supabase, "sea_freight");
    if (lengthCm && widthCm && heightCm && lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      calculatedCbm = (lengthCm * widthCm * heightCm) / 1000000;
      calculatedCbmCost = calculateFreightByCbm(calculatedCbm, cbmPricing).freightAmount;
      console.log(`CBM calculated: ${calculatedCbm.toFixed(6)}, Cost: ${formatGhs(calculatedCbmCost, cbmPricing.currency)}`);
    }

    // Find container by name or number if provided
    let resolvedContainerId = containerId;
    let companyId: string | null = null;
    const containerRef = containerName || containerNumber;

    if (!resolvedContainerId && containerRef) {
      const { data: container } = await supabase
        .from("containers")
        .select("id, company_id")
        .or(`container_number.eq.${containerRef},container_number.ilike.%${containerRef}%`)
        .maybeSingle();

      if (container) {
        resolvedContainerId = container.id;
        companyId = container.company_id;
      }
    } else if (resolvedContainerId) {
      const { data: container } = await supabase
        .from("containers")
        .select("company_id")
        .eq("id", resolvedContainerId)
        .maybeSingle();

      if (container) {
        companyId = container.company_id;
      }
    }

    // Find and update shipment - keep sheet tracking/customer code as source of truth
    let shipmentId: string | null = null;
    const sheetTrackingCode = (customerUserCode || uniqueTrackingCode || effectiveTracking).trim();

    // First try to find shipment by tracking number
    const { data: shipment } = await supabase
      .from("shipments")
      .select("id, user_code, user_id")
      .eq("tracking_number", effectiveTracking)
      .maybeSingle();

    if (shipment) {
      shipmentId = shipment.id;

      // Update shipment status based on normalized status
      const shipmentStatusMap: Record<string, string> = {
        "received": "pending",
        "packed": "pending",
        "left_china": "in-transit",
        "in_transit": "in-transit",
        "arrived": "arrived",
        "delivered": "delivered",
      };

      await supabase
        .from("shipments")
        .update({
          status: shipmentStatusMap[normalizedStatus] || "in-transit",
          notes: `${shipmentStatus || "Updated"} on ${dateReceived || fulfillmentDate || new Date().toISOString().split("T")[0]}. ${notes || ""}`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", shipment.id);

      console.log("Updated shipment status:", shipment.id);
    }

    // CUSTOMER MATCHING: Use phone from sheet FIRST, then fallback to profile lookup.
    // This ensures SMS works even for unregistered customers.
    let resolvedPhone: string | null = null;
    let resolvedName = customerName || null;
    let profileUserId: string | null = null;

    // Priority 1: Use phone number directly from the sheet
    const phoneFromSheet = normalizePhone(customerPhoneRaw);
    if (phoneFromSheet) {
      resolvedPhone = phoneFromSheet;
      console.log(`Using phone directly from sheet: ${phoneFromSheet}`);
    }

    // Priority 2: Try profile lookup by code for name/userId enrichment
    if (sheetTrackingCode) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name, user_id, unique_code")
        .eq("unique_code", sheetTrackingCode)
        .maybeSingle();

      if (profile) {
        // Use profile phone only if sheet didn't provide one
        if (!resolvedPhone && profile.phone) {
          resolvedPhone = normalizePhone(profile.phone);
        }
        resolvedName = resolvedName || profile.full_name;
        profileUserId = profile.user_id;
        console.log(`Matched customer by user code: ${sheetTrackingCode}`);
      }
    }

    // Priority 3: Fallback match by customer name
    if (!resolvedPhone && customerName) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("phone, full_name, user_id, unique_code")
        .ilike("full_name", `%${customerName.trim()}%`)
        .limit(5);

      if (profiles && profiles.length > 0) {
        const exactMatch = profiles.find(
          p => p.full_name?.toLowerCase().trim() === customerName.toLowerCase().trim()
        );
        const matchedProfile = exactMatch || profiles[0];

        if (!resolvedPhone && matchedProfile.phone) {
          resolvedPhone = normalizePhone(matchedProfile.phone);
        }
        resolvedName = matchedProfile.full_name;
        profileUserId = matchedProfile.user_id;
        console.log(`Matched customer by name: ${customerName} -> ${matchedProfile.full_name}`);
      }
    }

    // Preserve exact code from sheet for storage/tracking
    const effectiveUserCode = sheetTrackingCode || null;
    console.log(`Using sheet user code for tracking: ${effectiveUserCode || "<missing>"}, phone: ${resolvedPhone || "<none>"}`);

    // Insert warehouse submission record with CBM data
    // Use effectiveUserCode so non-registered customers can still track by their code
    const { data: submission, error: insertError } = await supabase
      .from("warehouse_submissions")
      .insert({
        container_id: resolvedContainerId || null,
        tracking_number: effectiveTracking,
        product_name: productName,
        product_details: productDetails || null,
        quantity_received: quantityReceived || 1,
        fulfillment_date: dateReceived || fulfillmentDate || new Date().toISOString().split("T")[0],
        customer_user_code: effectiveUserCode,
        shipment_id: shipmentId,
        status: normalizedStatus,
        notes: notes || null,
        visible_to_customer: true,
        // New CBM fields
        customer_name: customerName || null,
        container_name: containerName || null,
        length_cm: lengthCm || 0,
        width_cm: widthCm || 0,
        height_cm: heightCm || 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting submission:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save submission", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created warehouse submission:", submission.id);

    // Create in-app notification for registered customer
    if (profileUserId && effectiveUserCode) {
      const notificationTitle = normalizedStatus === "arrived" 
        ? "Shipment Arrived at Ghana Warehouse!" 
        : "Shipment Status Update";
      
      const notificationMessage = normalizedStatus === "arrived"
        ? `Your shipment (${effectiveTracking}) has arrived at Tema Warehouse. ${calculatedCbmCost > 0 ? `Freight Charge: ${formatGhs(calculatedCbmCost, cbmPricing.currency)}.` : ''} Please schedule delivery and make payment.`
        : `Your shipment (${effectiveTracking}) for ${productName} has been updated to: ${shipmentStatus || normalizedStatus}.`;

      await supabase.from("notifications").insert({
        user_id: profileUserId,
        user_code: effectiveUserCode,
        company_id: companyId,
        type: "warehouse_update",
        title: notificationTitle,
        message: notificationMessage,
      });
      console.log("Created notification for registered user:", effectiveUserCode);
    } else {
      console.log(`Non-registered customer shipment recorded. Tracking code: ${effectiveUserCode}. They can track at /track`);
    }

    // Send SMS notification automatically for newly added Received/Packed records
    let smsSent = false;
    let smsError: string | null = null;
    let smsMessageId: string | null = null;
    const shouldSendSms = normalizedStatus === "received" || normalizedStatus === "packed";

    if (shouldSendSms) {
      if (!effectiveUserCode) {
        smsError = "Missing tracking/customer code from uploaded sheet";
        console.error(`SMS BLOCKED: ${smsError}`);
      } else if (!resolvedPhone) {
        smsError = `No phone number found — sheet phone: "${customerPhoneRaw || "empty"}", profile lookup failed for code: "${effectiveUserCode}"`;
        console.error(`SMS BLOCKED: ${smsError}`);
      } else {
        const clientId = Deno.env.get("HUBTEL_SMS_CLIENT_ID");
        const clientSecret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET");

        if (clientId && clientSecret) {
          const smsMessage = `Hello ${resolvedName || "Valued Customer"}, your goods have been received and packed at our China warehouse.\n\nTrack your shipment using this code:\n\n${effectiveUserCode}\n\nVisit https://amoligaelitefreight.com to create an account, track your goods, and request delivery.\n\nAmoliga Elite Freight & Logistics\n\nPowered by Asesawa Cauchere.`;

          console.log(`SENDING SMS to ${resolvedPhone} for code ${effectiveUserCode}, name: ${resolvedName}`);
          const result = await sendSMSWithRetry(resolvedPhone, smsMessage, clientId, clientSecret);
          smsSent = result.success;
          smsError = result.error || null;
          smsMessageId = result.messageId || null;
          console.log(`SMS result: sent=${smsSent}, messageId=${smsMessageId}, error=${smsError}`);
        } else {
          smsError = "CRITICAL: SMS credentials (HUBTEL_SMS_CLIENT_ID/SECRET) not configured in environment";
          console.error(smsError);
        }
      }
    }

    // Update submission with SMS status
    await supabase
      .from("warehouse_submissions")
      .update({
        sms_sent: smsSent,
        sms_sent_at: smsSent ? new Date().toISOString() : null,
        sms_error: smsError,
      })
      .eq("id", submission.id);

    // Log admin notification if required SMS (Received/Packed) failed
    if (shouldSendSms && !smsSent && smsError) {
      console.error(`SMS issue for submission ${submission.id}: ${smsError}`);
      await supabase.from("notifications").insert({
        company_id: companyId,
        type: "sms_failure",
        title: resolvedPhone ? "SMS Delivery Failed" : "Customer Not Matched",
        message: `Code: ${effectiveUserCode || "N/A"}, Customer: ${customerName || "Unknown"}. ${smsError}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        submissionId: submission.id,
        shipmentUpdated: !!shipmentId,
        customerMatched: !!resolvedPhone,
        smsSent,
        smsMessageId,
        smsError,
        cbm: calculatedCbm,
        cbmCost: calculatedCbmCost,
        normalizedStatus,
        message: "Warehouse submission processed successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
