import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GUANGZHOU_KEYWORDS = [
  "guangzhou", "广州", "guangdong", "广东", "baiyun", "白云",
  "sorting center", "分拣中心", "transit center", "中转",
  "panyu", "番禺", "tianhe", "天河", "huadu", "花都",
];

function detectGuangzhouFromEvents(events: Array<{ location?: string; status?: string; description?: string }>): {
  detected: boolean;
  arrival_time: string | null;
} {
  for (const event of events) {
    const text = `${event.location || ""} ${event.status || ""} ${event.description || ""}`.toLowerCase();
    if (GUANGZHOU_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))) {
      return { detected: true, arrival_time: (event as any).datetime || null };
    }
  }
  return { detected: false, arrival_time: null };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < ab.length; i++) {
    result |= ab[i] ^ bb[i];
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get("SHIP24_WEBHOOK_SECRET");
    if (!WEBHOOK_SECRET) {
      console.error("SHIP24_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook authenticity via secret header
    const providedSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (!providedSecret || !timingSafeEqual(providedSecret, WEBHOOK_SECRET)) {
      console.error("Webhook verification failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Ship24 webhook received:", JSON.stringify(payload).substring(0, 500));

    // Parse Ship24 webhook payload
    const tracker = payload?.data?.tracker;
    if (!tracker?.trackingNumber) {
      console.error("No tracking number in webhook payload");
      return new Response(JSON.stringify({ ok: true, message: "No tracking number" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingNumber = tracker.trackingNumber;
    const courierName = tracker.courier?.name || "";
    const courierCode = tracker.courier?.code || "";
    const status = tracker.status || "Unknown";
    const events = tracker.events || [];
    const isDelivered = status.toLowerCase() === "delivered";

    // Get current location from latest event
    const latestEvent = events[0];
    const currentLocation = latestEvent?.location || "";

    // Format events for storage
    const formattedEvents = events.map((evt: any) => ({
      context: evt.status || evt.description || "Update",
      location: evt.location || "",
      time: evt.datetime || "",
      status: evt.status || "",
    }));

    // Guangzhou detection
    const guangzhou = detectGuangzhouFromEvents(events);

    // Build upsert data
    const upsertData: Record<string, any> = {
      tracking_number: trackingNumber,
      courier_code: courierCode,
      courier_name: courierName,
      status,
      current_location: currentLocation,
      is_delivered: isDelivered,
      events: formattedEvents,
      last_webhook_at: new Date().toISOString(),
    };

    if (guangzhou.detected) {
      upsertData.guangzhou_detected = true;
      upsertData.guangzhou_detected_at = guangzhou.arrival_time || new Date().toISOString();
      upsertData.warehouse_status = "Arrived in Guangzhou";
    }

    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("shipment_tracking_cache")
      .upsert(upsertData, { onConflict: "tracking_number" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to store tracking data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SYNC: Update warehouse_submissions status based on tracking events ---
    try {
      const { data: submissions } = await supabase
        .from("warehouse_submissions")
        .select("id, status, container_id, customer_user_code")
        .eq("tracking_number", trackingNumber);

      if (submissions && submissions.length > 0) {
        // Map Ship24 status to warehouse status
        let warehouseStatus = "received";
        const statusLower = status.toLowerCase();
        if (statusLower === "delivered") warehouseStatus = "delivered";
        else if (statusLower.includes("transit") || statusLower.includes("shipped")) warehouseStatus = "processing";
        else if (guangzhou.detected) warehouseStatus = "received";
        else if (statusLower.includes("out_for_delivery") || statusLower.includes("out for delivery")) warehouseStatus = "shipped";

        for (const sub of submissions) {
          await supabase
            .from("warehouse_submissions")
            .update({ status: warehouseStatus })
            .eq("id", sub.id);
        }
        console.log(`Updated ${submissions.length} warehouse_submissions for ${trackingNumber} to ${warehouseStatus}`);
      }
    } catch (syncErr) {
      console.error(`Warehouse submission sync failed for ${trackingNumber}:`, syncErr);
    }

    // --- SYNC: Update shipments table if tracking_number matches ---
    try {
      const shipmentStatusMap: Record<string, string> = {
        "delivered": "delivered",
        "in_transit": "in-transit",
        "in transit": "in-transit",
        "out_for_delivery": "arrived",
        "out for delivery": "arrived",
        "available_for_pickup": "arrived",
      };
      const mappedStatus = shipmentStatusMap[status.toLowerCase()] || null;

      if (mappedStatus) {
        const { data: shipments } = await supabase
          .from("shipments")
          .select("id, status")
          .eq("tracking_number", trackingNumber);

        if (shipments && shipments.length > 0) {
          for (const s of shipments) {
            // Only update if status progresses forward
            const statusOrder = ["pending", "in-transit", "customs", "arrived", "delivered"];
            const currentIdx = statusOrder.indexOf(s.status);
            const newIdx = statusOrder.indexOf(mappedStatus);
            if (newIdx > currentIdx) {
              await supabase
                .from("shipments")
                .update({ status: mappedStatus })
                .eq("id", s.id);
              console.log(`Updated shipment ${s.id} status to ${mappedStatus}`);
            }
          }
        }
      }
    } catch (shipmentErr) {
      console.error(`Shipment sync failed for ${trackingNumber}:`, shipmentErr);
    }

    // --- SYNC: Create notification for customer if status changed significantly ---
    try {
      // Find the customer's user_code from warehouse_submissions or container_items
      const { data: subs } = await supabase
        .from("warehouse_submissions")
        .select("customer_user_code")
        .eq("tracking_number", trackingNumber)
        .not("customer_user_code", "is", null)
        .limit(1);

      const userCode = subs?.[0]?.customer_user_code;
      if (userCode) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("unique_code", userCode)
          .limit(1)
          .maybeSingle();

        if (profile?.user_id) {
          const statusLabel = status.replace(/_/g, " ");
          await supabase.from("notifications").insert({
            user_id: profile.user_id,
            user_code: userCode,
            type: "tracking_update",
            title: `Shipment Update: ${trackingNumber}`,
            message: `Your shipment ${trackingNumber} status updated to "${statusLabel}". ${currentLocation ? `Current location: ${currentLocation}` : ""}`.trim(),
          });
        }
      }
    } catch (notifErr) {
      console.error(`Notification creation failed for ${trackingNumber}:`, notifErr);
    }

    // Trigger warehouse alert SMS if Guangzhou/warehouse proximity detected
    if (guangzhou.detected) {
      try {
        console.log(`Triggering warehouse alert for ${trackingNumber}`);
        const alertResponse = await fetch(`${supabaseUrl}/functions/v1/send-warehouse-alert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            tracking_number: trackingNumber,
            courier_name: courierName || "Unknown",
            shipment_location: currentLocation || "Guangzhou Area",
          }),
        });
        const alertResult = await alertResponse.text();
        console.log(`Warehouse alert result for ${trackingNumber}:`, alertResult.substring(0, 200));
      } catch (alertErr) {
        console.error(`Failed to send warehouse alert for ${trackingNumber}:`, alertErr);
      }
    }

    console.log(`Webhook processed successfully for ${trackingNumber}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
