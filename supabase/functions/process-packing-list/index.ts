import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PackingListItem {
  customerCode: string;
  customerPhone?: string;
  productName: string;
  goodsType?: string;
  quantity: number;
  cbm: number;
  weightKg: number;
}

interface ProcessRequest {
  packingListId: string;
}

interface CustomerBatch {
  customerCode: string;
  customerPhone: string | null;
  customerName: string | null;
  products: string[];
  totalQuantity: number;
  totalCbm: number;
  totalWeight: number;
  matchedProfileId: string | null;
}

/**
 * Validate and normalize a phone number to international format (233XXXXXXXXX).
 * Accepts: +233XXXXXXXXX, 233XXXXXXXXX, 0XXXXXXXXX, raw digits.
 * Returns null if invalid.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  // Strip spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  // Must be digits only after cleaning
  if (!/^\d{7,15}$/.test(cleaned)) return null;
  // Normalize Ghana numbers
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    cleaned = "233" + cleaned.substring(1);
  }
  // If it's a short local number without country code, prepend 233
  if (!cleaned.startsWith("233") && cleaned.length <= 10) {
    cleaned = "233" + cleaned;
  }
  // Final validation: must be 12 digits for Ghana (233 + 9 digits)
  if (cleaned.startsWith("233") && cleaned.length !== 12) return null;
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT by creating an auth client with the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Verify user has admin or manager role
    const { data: roles } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "manager"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for elevated database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { packingListId }: ProcessRequest = await req.json();

    if (!packingListId) {
      return new Response(
        JSON.stringify({ error: "Missing packingListId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing packing list: ${packingListId}`);

    // Get all items for this packing list
    const { data: items, error: itemsError } = await supabase
      .from("packing_list_items")
      .select("*")
      .eq("packing_list_id", packingListId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items found in packing list" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${items.length} items to process`);

    // Group items by customer code
    const customerBatches: Map<string, CustomerBatch> = new Map();

    for (const item of items) {
      const key = item.customer_code || item.customer_phone || `unknown-${item.id}`;
      
      if (!customerBatches.has(key)) {
        customerBatches.set(key, {
          customerCode: item.customer_code || "",
          customerPhone: item.customer_phone,
          customerName: null,
          products: [],
          totalQuantity: 0,
          totalCbm: 0,
          totalWeight: 0,
          matchedProfileId: null,
        });
      }

      const batch = customerBatches.get(key)!;
      batch.products.push(item.product_name);
      batch.totalQuantity += item.quantity || 0;
      batch.totalCbm += parseFloat(item.cbm) || 0;
      batch.totalWeight += parseFloat(item.weight_kg) || 0;
    }

    console.log(`Grouped into ${customerBatches.size} customer batches`);

    // Match customers to profiles (without overriding sheet code/phone source of truth)
    for (const [, batch] of customerBatches) {
      // Match by exact customer code from sheet
      if (batch.customerCode) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, phone, unique_code")
          .eq("unique_code", batch.customerCode)
          .maybeSingle();

        if (profile) {
          batch.matchedProfileId = profile.id;
          batch.customerName = profile.full_name;
          console.log(`Matched customer code ${batch.customerCode} to profile ${profile.full_name}`);
        }
      }

      // Fallback match by phone for name/profile linking only (do NOT override sheet code)
      if (!batch.matchedProfileId && batch.customerPhone) {
        const normalizedPhone = batch.customerPhone.replace(/\s/g, "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, phone, unique_code")
          .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone}%`)
          .maybeSingle();

        if (profile) {
          batch.matchedProfileId = profile.id;
          batch.customerName = profile.full_name;
          console.log(`Matched phone ${batch.customerPhone} to profile ${profile.full_name}`);
        }
      }
    }

    // Create SMS batches and send messages
    const results = {
      processed: 0,
      smsSent: 0,
      smsFailed: 0,
      noPhone: 0,
      noCode: 0,
      batches: [] as any[],
    };

    const hubtelClientId = Deno.env.get("HUBTEL_SMS_CLIENT_ID");
    const hubtelClientSecret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET");

    for (const [key, batch] of customerBatches) {
      results.processed++;

      // Create product summary
      const productSummary = batch.products.length > 3
        ? `${batch.products.slice(0, 3).join(", ")} (+${batch.products.length - 3} more)`
        : batch.products.join(", ");

      // Check for existing batch to prevent duplicates
      const { data: existingBatch } = await supabase
        .from("sms_batches")
        .select("id")
        .eq("packing_list_id", packingListId)
        .eq("customer_code", batch.customerCode)
        .maybeSingle();

      if (existingBatch) {
        console.log(`Skipping duplicate batch for customer ${batch.customerCode}`);
        continue;
      }

      // Insert SMS batch record
      const { data: smsBatch, error: batchError } = await supabase
        .from("sms_batches")
        .insert({
          packing_list_id: packingListId,
          customer_code: batch.customerCode,
          customer_phone: batch.customerPhone || "",
          customer_name: batch.customerName,
          product_summary: productSummary,
          total_quantity: batch.totalQuantity,
          total_cbm: batch.totalCbm,
          total_weight: batch.totalWeight,
        })
        .select()
        .single();

      if (batchError) {
        console.error(`Error creating SMS batch:`, batchError);
        continue;
      }

      // Update items with batch reference
      await supabase
        .from("packing_list_items")
        .update({ sms_batch_id: smsBatch.id, matched_profile_id: batch.matchedProfileId })
        .eq("packing_list_id", packingListId)
        .eq("customer_code", batch.customerCode);

      const trackingCodeFromSheet = (batch.customerCode || "").trim();
      if (!trackingCodeFromSheet) {
        results.noCode++;
        await supabase
          .from("sms_batches")
          .update({ sms_error: "Missing tracking/customer code from uploaded sheet" })
          .eq("id", smsBatch.id);
        results.batches.push({ ...smsBatch, status: "no_code" });
        continue;
      }

      // Validate & normalize phone number
      const validatedPhone = normalizePhone(batch.customerPhone);
      if (!validatedPhone) {
        results.noPhone++;
        const phoneError = batch.customerPhone
          ? `Invalid phone format: ${batch.customerPhone}`
          : "No phone number available";
        await supabase
          .from("sms_batches")
          .update({ sms_error: phoneError })
          .eq("id", smsBatch.id);
        results.batches.push({ ...smsBatch, status: "no_phone" });
        continue;
      }

      // Send SMS automatically when credentials are configured
      if (hubtelClientId && hubtelClientSecret) {
        const customerName = batch.customerName || "Valued Customer";

        const smsMessage = `Hello ${customerName}, your goods have been received and packed at our China warehouse.\n\nTrack your shipment using this code:\n\n${trackingCodeFromSheet}\n\nVisit https://amoligaelitefreight.com to create an account, track your goods, and request delivery.\n\nAmoliga Elite Freight & Logistics\n\nPowered by Asesawa Cauchere.`;

        console.log(`Sending SMS to ${validatedPhone} for code ${trackingCodeFromSheet}`);

        try {
          const smsUrl = new URL("https://sms.hubtel.com/v1/messages/send");
          smsUrl.searchParams.set("clientid", hubtelClientId);
          smsUrl.searchParams.set("clientsecret", hubtelClientSecret);
          smsUrl.searchParams.set("from", "Amoliga");
          smsUrl.searchParams.set("to", validatedPhone);
          smsUrl.searchParams.set("content", smsMessage);

          const smsResponse = await fetch(smsUrl.toString(), { method: "GET" });
          const responseText = await smsResponse.text();
          console.log(`Hubtel response for ${validatedPhone}: ${responseText.substring(0, 300)}`);

          let smsData;
          try {
            smsData = JSON.parse(responseText);
          } catch {
            throw new Error(`Invalid Hubtel response: ${responseText.substring(0, 200)}`);
          }

          if (smsData.status === 0) {
            results.smsSent++;
            await supabase
              .from("sms_batches")
              .update({
                sms_sent: true,
                sms_sent_at: new Date().toISOString(),
                sms_message_id: smsData.messageId,
                sms_error: null,
              })
              .eq("id", smsBatch.id);
            results.batches.push({ ...smsBatch, status: "sent", messageId: smsData.messageId });
          } else {
            results.smsFailed++;
            const errMsg = smsData.statusDescription || `SMS failed with status ${smsData.status}`;
            await supabase
              .from("sms_batches")
              .update({ sms_error: errMsg })
              .eq("id", smsBatch.id);
            results.batches.push({ ...smsBatch, status: "failed", error: errMsg });
          }
        } catch (smsError) {
          results.smsFailed++;
          const errorMsg = smsError instanceof Error ? smsError.message : "Unknown error";
          console.error(`SMS error for ${validatedPhone}:`, errorMsg);
          await supabase
            .from("sms_batches")
            .update({ sms_error: errorMsg })
            .eq("id", smsBatch.id);
          results.batches.push({ ...smsBatch, status: "failed", error: errorMsg });
        }

        // Small delay to avoid rate-limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.error("CRITICAL: Hubtel SMS credentials not found in environment");
        await supabase
          .from("sms_batches")
          .update({ sms_error: "SMS credentials not configured" })
          .eq("id", smsBatch.id);
        results.batches.push({ ...smsBatch, status: "failed", error: "SMS credentials not configured" });
      }
    }

    // Update packing list status
    await supabase
      .from("packing_lists")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", packingListId);

    console.log(`Processing complete. Sent: ${results.smsSent}, Failed: ${results.smsFailed}, No Phone: ${results.noPhone}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Process packing list error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
