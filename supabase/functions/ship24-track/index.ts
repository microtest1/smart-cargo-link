import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeString(str: string, maxLength = 200): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").substring(0, maxLength).trim();
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.substring(0, 128);

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp.substring(0, 128);
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.substring(0, 128);

  return "unknown";
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(req: Request, endpoint: string): Promise<Response | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Tracking service is temporarily unavailable" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const ipHash = await sha256Hex(getClientIp(req));

  const { data, error } = await sb.rpc("consume_endpoint_rate_limit", {
    p_endpoint: endpoint,
    p_ip_hash: ipHash,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: RATE_LIMIT_MAX_REQUESTS,
  });

  if (error) {
    console.error("Rate limit check failed:", error.message);
    return new Response(
      JSON.stringify({ error: "Tracking service is temporarily unavailable" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": RATE_LIMIT_WINDOW_SECONDS.toString(),
        },
      }
    );
  }

  return null;
}

// AEF Warehouse addresses for detection
const SEA_WAREHOUSE = {
  name: "AEF Logistics China Sea Warehouse",
  keywords: ["佛山市南海区", "里水镇", "科冠路3号", "6号楼101仓", "立特仓", "立特16624728819", "nanhai", "lishui"],
  message: "Shipment delivered to Amoliga Elite China Warehouse.",
  type: "sea",
};

const AIR_WAREHOUSE = {
  name: "AEF Logistics China Air Warehouse",
  keywords: ["白云区", "棠景街道", "机场路761", "粤福置业", "2013房", "baiyun"],
  message: "Shipment received at Amoliga Elite Guangzhou Air Cargo Warehouse.",
  type: "air",
};

// Guangzhou proximity keywords for detecting shipments near the warehouse
const GUANGZHOU_KEYWORDS = [
  "guangzhou", "广州", "guangdong", "广东", "baiyun", "白云",
  "sorting center", "分拣中心", "transit center", "中转",
  "panyu", "番禺", "tianhe", "天河", "huadu", "花都",
];

function detectGuangzhouProximity(events: Array<{ location?: string; context?: string }>): {
  detected: boolean;
  arrival_time: string | null;
} {
  for (const event of events) {
    const text = `${event.location || ""} ${event.context || ""}`.toLowerCase();
    const matches = GUANGZHOU_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
    if (matches.length >= 1) {
      return { detected: true, arrival_time: (event as any).time || null };
    }
  }
  return { detected: false, arrival_time: null };
}

function detectWarehouseDelivery(events: Array<{ location?: string; description?: string }>): {
  detected: boolean;
  warehouse_name: string | null;
  warehouse_type: string | null;
  message: string | null;
} {
  for (const event of events) {
    const text = `${event.location || ""} ${event.description || ""}`.toLowerCase();

    const seaMatches = SEA_WAREHOUSE.keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (seaMatches.length >= 2) {
      return { detected: true, warehouse_name: SEA_WAREHOUSE.name, warehouse_type: SEA_WAREHOUSE.type, message: SEA_WAREHOUSE.message };
    }

    const airMatches = AIR_WAREHOUSE.keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (airMatches.length >= 2) {
      return { detected: true, warehouse_name: AIR_WAREHOUSE.name, warehouse_type: AIR_WAREHOUSE.type, message: AIR_WAREHOUSE.message };
    }
  }
  return { detected: false, warehouse_name: null, warehouse_type: null, message: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rateLimitResponse = await enforceRateLimit(req, "ship24-track");
    if (rateLimitResponse) return rateLimitResponse;

    const { tracking_number } = await req.json();

    if (!tracking_number || typeof tracking_number !== "string") {
      return new Response(
        JSON.stringify({ error: "tracking_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanNumber = sanitizeString(tracking_number, 50);

    // Validate tracking number format (alphanumeric, hyphens, max 50 chars)
    if (!/^[A-Za-z0-9\-]{4,50}$/.test(cleanNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid tracking number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CACHE-FIRST: Check shipment_tracking_cache before calling paid Ship24 API
    const CACHE_MAX_AGE_MINUTES = 15;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        const { data: cached } = await sb
          .from("shipment_tracking_cache")
          .select("*")
          .eq("tracking_number", cleanNumber)
          .maybeSingle();

        if (cached && cached.updated_at) {
          const ageMs = Date.now() - new Date(cached.updated_at).getTime();
          const isStale = ageMs > CACHE_MAX_AGE_MINUTES * 60 * 1000;

          if (!isStale && cached.events && (cached.events as any[]).length > 0) {
            console.log(`Cache HIT for ${cleanNumber} (age: ${Math.round(ageMs / 1000)}s)`);
            const cachedResult = {
              tracking_number: cleanNumber,
              courier_code: cached.courier_code || "",
              courier_name: cached.courier_name || "Detecting...",
              status: cached.status || "Unknown",
              is_delivered: cached.is_delivered || false,
              current_location: cached.current_location || "",
              destination: cached.destination || "GH",
              events: cached.events || [],
              warehouse_detection: {
                detected: false,
                warehouse_name: null,
                warehouse_type: null,
                message: null,
              },
              guangzhou_proximity: {
                detected: cached.guangzhou_detected || false,
                arrival_time: cached.guangzhou_detected_at,
              },
              warehouse_confirmation: cached.warehouse_confirmation || false,
              warehouse_confirmed_at: cached.warehouse_confirmed_at,
              query_time: new Date().toISOString(),
              cached: true,
            };
            return new Response(JSON.stringify(cachedResult), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.log(`Cache STALE for ${cleanNumber} (age: ${Math.round(ageMs / 1000)}s), calling Ship24 API`);
        } else {
          console.log(`Cache MISS for ${cleanNumber}, calling Ship24 API`);
        }
      }
    } catch (cacheErr) {
      console.error("Cache lookup failed (non-fatal):", cacheErr);
    }

    const SHIP24_API_KEY = Deno.env.get("SHIP24_API_KEY");

    if (!SHIP24_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Tracking service is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "Authorization": `Bearer ${SHIP24_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Step 1: Create a tracker with courier hints for Chinese logistics providers
    const today = new Date().toISOString().split("T")[0];
    console.log(`Creating Ship24 tracker for: ${cleanNumber}`);
    const createRes = await fetch("https://api.ship24.com/public/v1/trackers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        trackingNumber: cleanNumber,
        originCountryCode: "CN",
        destinationCountryCode: "GH",
        shippingDate: today,
        destinationPostCode: "00233",
        title: "Shipment for Amoliga Elite Logistics",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Ship24 create tracker error:", createRes.status, errText);

      // Only block on subscription errors; all others (409, validation, already exists) fall through
      try {
        const errData = JSON.parse(errText);
        const errCode = errData?.errors?.[0]?.code || "";
        const errMsg = errData?.errors?.[0]?.message || "";
        if (errCode === "no_active_subscription" || errMsg.includes("subscription")) {
          return new Response(
            JSON.stringify({ error: "Tracking service subscription is inactive. Please contact support." }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch { /* continue to fetch */ }
      console.log("Continuing to fetch results despite create error...");
    } else {
      await createRes.text();
    }

    // Step 2: Fetch tracking results
    // Use the tracking/search endpoint which returns results by tracking number
    console.log(`Fetching Ship24 tracking results for: ${cleanNumber}`);
    const trackRes = await fetch("https://api.ship24.com/public/v1/trackers/search/" + encodeURIComponent(cleanNumber) + "/results", {
      method: "GET",
      headers,
    });

    if (!trackRes.ok) {
      const errText = await trackRes.text();
      console.error("Ship24 track error:", trackRes.status, errText);
      
      if (trackRes.status === 404) {
        return new Response(
          JSON.stringify({ error: "No shipment found. Please verify your tracking number." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to fetch tracking data. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trackData = await trackRes.json();
    console.log("Ship24 response:", JSON.stringify(trackData).substring(0, 500));

    // Parse Ship24 response
    const trackings = trackData?.data?.trackings || [];
    
    if (!trackings.length) {
      return new Response(
        JSON.stringify({
          tracking_number: cleanNumber,
          courier_code: "",
          courier_name: "Detecting...",
          status: "Registered",
          is_delivered: false,
          current_location: "",
          destination: "GH",
          events: [],
          warehouse_detection: { detected: false, warehouse_name: null, warehouse_type: null, message: null },
          query_time: new Date().toISOString(),
          message: "Shipment registered. Tracking events will appear once the courier scans the package.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the first (most relevant) tracking
    const tracking = trackings[0];
    const shipment = tracking?.shipment || {};
    const events = tracking?.events || [];

    // Map Ship24 status to our status
    const statusInfo = shipment?.statusMilestone || "unknown";
    const statusMap: Record<string, string> = {
      "info_received": "Info Received",
      "in_transit": "In Transit",
      "out_for_delivery": "Out for Delivery",
      "delivered": "Delivered",
      "failed_attempt": "Failed Attempt",
      "available_for_pickup": "Available for Pickup",
      "exception": "Exception",
      "pending": "Pending",
    };

    const status = statusMap[statusInfo] || statusInfo || "Unknown";
    const isDelivered = statusInfo === "delivered";

    // Get courier info - check tracker-level courier first, then event-level
    const trackerCouriers = tracking?.tracker?.courierList || [];
    const courierCode = trackerCouriers[0]?.courierCode || events[0]?.courierCode || "";
    const courierNameRaw = trackerCouriers[0]?.courierName || "";
    const courierName = courierNameRaw || (courierCode ? courierCode.charAt(0).toUpperCase() + courierCode.slice(1).replace(/-/g, " ") : "");
    const isUnknownCourier = !courierCode && !courierNameRaw;

    // Build events list
    const formattedEvents = events.map((evt: any) => ({
      context: evt.description || evt.status || "Update",
      location: evt.location || "",
      time: evt.datetime || evt.occurrenceDatetime || "",
      status: evt.status || "",
    }));

    // Detect warehouse delivery and Guangzhou proximity
    const warehouseDetection = detectWarehouseDelivery(formattedEvents);
    const guangzhouProximity = detectGuangzhouProximity(formattedEvents);

    // Get current location from latest event
    const latestEvent = events[0];
    const currentLocation = latestEvent?.location || "";

    // If courier is unknown, retry with increasing delay (up to 2 attempts)
    let retryCourierCode = courierCode;
    let retryCourierName = courierName;
    if (isUnknownCourier) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const delay = attempt * 5000; // 5s, 10s
        console.log(`Courier unknown, retry ${attempt}/2 after ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        const retryRes = await fetch("https://api.ship24.com/public/v1/trackers/search/" + encodeURIComponent(cleanNumber) + "/results", { method: "GET", headers });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const rt = retryData?.data?.trackings?.[0];
          const rtCouriers = rt?.tracker?.courierList || [];
          const rtEvtCourier = rt?.events?.[0]?.courierCode || "";
          retryCourierCode = rtCouriers[0]?.courierCode || rtEvtCourier || "";
          retryCourierName = rtCouriers[0]?.courierName || (retryCourierCode ? retryCourierCode.charAt(0).toUpperCase() + retryCourierCode.slice(1).replace(/-/g, " ") : "");
          if (retryCourierCode) break;
        }
      }
    }

    const result = {
      tracking_number: cleanNumber,
      courier_code: retryCourierCode || courierCode,
      courier_name: retryCourierName || courierName || "Detecting...",
      status,
      is_delivered: isDelivered,
      current_location: currentLocation,
      destination: shipment?.destinationCountryCode || "GH",
      events: formattedEvents,
      warehouse_detection: warehouseDetection,
      guangzhou_proximity: guangzhouProximity,
      query_time: new Date().toISOString(),
    };

    // Cache tracking result in shipment_tracking_cache
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseServiceKey);

      const cacheData: Record<string, any> = {
        tracking_number: cleanNumber,
        courier_code: result.courier_code,
        courier_name: result.courier_name,
        status: result.status,
        current_location: result.current_location,
        destination: result.destination,
        is_delivered: result.is_delivered,
        events: result.events,
      };

      if (guangzhouProximity.detected) {
        cacheData.guangzhou_detected = true;
        cacheData.guangzhou_detected_at = guangzhouProximity.arrival_time || new Date().toISOString();
        cacheData.warehouse_status = "Arrived in Guangzhou";
      }

      await sb.from("shipment_tracking_cache").upsert(cacheData, { onConflict: "tracking_number" });
    } catch (cacheErr) {
      console.error("Cache write failed (non-fatal):", cacheErr);
    }

    // Also check if there's a warehouse_confirmation in cache
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseServiceKey);
      const { data: cached } = await sb
        .from("shipment_tracking_cache")
        .select("warehouse_confirmation, warehouse_confirmed_at, warehouse_status, guangzhou_detected, guangzhou_detected_at")
        .eq("tracking_number", cleanNumber)
        .maybeSingle();

      if (cached) {
        (result as any).warehouse_confirmation = cached.warehouse_confirmation || false;
        (result as any).warehouse_confirmed_at = cached.warehouse_confirmed_at;
        if (cached.guangzhou_detected && !guangzhouProximity.detected) {
          result.guangzhou_proximity = { detected: true, arrival_time: cached.guangzhou_detected_at };
        }
      }
    } catch (readErr) {
      console.error("Cache read failed (non-fatal):", readErr);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Ship24 tracking error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
