import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AEF Warehouse addresses for detection
const SEA_WAREHOUSE = {
  name: "AEF Logistics China Sea Warehouse",
  keywords: ["佛山市南海区", "里水镇", "科冠路3号", "6号楼101仓", "立特仓", "立特16624728819"],
  phone: "",
  message: "Shipment delivered to Amoliga Elite China Warehouse.",
  type: "sea",
};

const AIR_WAREHOUSE = {
  name: "AEF Logistics China Air Warehouse",
  keywords: ["白云区", "棠景街道", "机场路761", "粤福置业", "2013房"],
  phone: "19230148373",
  message: "Shipment received at Amoliga Elite Guangzhou Air Cargo Warehouse.",
  type: "air",
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

// Detect if tracking event indicates delivery to AEF warehouse
function detectWarehouseDelivery(events: Array<{ context: string }>): {
  detected: boolean;
  warehouse: typeof SEA_WAREHOUSE | typeof AIR_WAREHOUSE | null;
} {
  for (const event of events) {
    const ctx = event.context || "";

    const seaMatches = SEA_WAREHOUSE.keywords.filter((kw) => ctx.includes(kw));
    if (seaMatches.length >= 2 || ctx.includes(SEA_WAREHOUSE.phone)) {
      return { detected: true, warehouse: SEA_WAREHOUSE };
    }

    const airMatches = AIR_WAREHOUSE.keywords.filter((kw) => ctx.includes(kw));
    if (airMatches.length >= 2 || ctx.includes(AIR_WAREHOUSE.phone)) {
      return { detected: true, warehouse: AIR_WAREHOUSE };
    }
  }
  return { detected: false, warehouse: null };
}

// Common Chinese logistics terms dictionary for fallback translation
const LOGISTICS_DICTIONARY: Record<string, string> = {
  "已签收": "Delivered / Signed",
  "签收": "Signed for",
  "已收件": "Picked up",
  "已揽收": "Picked up by courier",
  "揽收": "Picked up",
  "运输中": "In Transit",
  "在途": "In Transit",
  "派送中": "Out for Delivery",
  "正在派送": "Out for Delivery",
  "派件": "Dispatched for delivery",
  "到达": "Arrived at",
  "离开": "Departed from",
  "发往": "Sent to",
  "已发出": "Dispatched",
  "转运中心": "Transit Center",
  "分拨中心": "Distribution Center",
  "营业部": "Service Center",
  "快件": "Package",
  "包裹": "Parcel",
  "已装车": "Loaded onto vehicle",
  "卸车": "Unloaded",
  "安检": "Security check",
  "海关": "Customs",
  "清关": "Customs clearance",
  "退回": "Returned",
  "退件": "Return shipment",
  "异常": "Exception",
  "问题件": "Problem shipment",
  "代收点": "Collection point",
  "驿站": "Pickup station",
  "快递柜": "Parcel locker",
  "已取出": "Picked up from locker",
  "正在等待揽收": "Awaiting pickup",
  "商家正在通知快递公司揽件": "Merchant notifying courier for pickup",
  "已打包": "Packed",
  "打包完成": "Packing completed",
  "仓库": "Warehouse",
  "广州": "Guangzhou",
  "深圳": "Shenzhen",
  "佛山": "Foshan",
  "东莞": "Dongguan",
  "上海": "Shanghai",
  "北京": "Beijing",
  "义乌": "Yiwu",
  "顺德": "Shunde",
  "白云区": "Baiyun District",
  "乐从": "Lecong",
  "已到达": "Has arrived",
  "已离开": "Has departed",
  "快递员": "Courier",
  "正在投递": "Being delivered",
  "已放入": "Placed in",
  "代签收": "Signed on behalf",
  "本人签收": "Signed by recipient",
  "电话通知": "Phone notification",
  "等待取件": "Awaiting pickup",
  "已取件": "Picked up",
  "正在运输": "In transit",
  "中转站": "Transfer station",
  "集散中心": "Distribution hub",
};

// Translate using dictionary fallback
function translateWithDictionary(text: string): string {
  if (LOGISTICS_DICTIONARY[text]) return LOGISTICS_DICTIONARY[text];
  
  let translated = text;
  let hasTranslation = false;
  // Sort by length descending to match longer phrases first
  const entries = Object.entries(LOGISTICS_DICTIONARY).sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of entries) {
    if (translated.includes(zh)) {
      translated = translated.replaceAll(zh, en);
      hasTranslation = true;
    }
  }
  return hasTranslation ? translated : text;
}

// Translate Chinese text to English using Google Translate API with dictionary fallback
async function translateToEnglish(
  texts: string[],
  apiKey: string | null
): Promise<string[]> {
  if (!texts.length) return [];

  if (apiKey) {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: texts,
            source: "zh",
            target: "en",
            format: "text",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.data.translations.map(
          (t: { translatedText: string }) => t.translatedText
        );
      }
      console.error("Translation API error:", response.status);
      await response.text();
    } catch (err) {
      console.error("Translation error:", err);
    }
  }

  return texts.map(translateWithDictionary);
}

// Query Kuaidi100 realtime tracking API
// Kuaidi100 API: sign = MD5(param + key + customer).toUpperCase()
// - customer: the authorization/company code (KUAIDI100_API_KEY from user's "key")
// - key: the signing secret (KUAIDI100_CUSTOMER_ID from user's "secret")
async function queryKuaidi100(
  trackingNumber: string,
  courierCode: string,
  customerCode: string,
  signingKey: string
): Promise<any> {
  const param = JSON.stringify({
    com: courierCode,
    num: trackingNumber,
    resultv2: "4",
  });

  // sign = MD5(param + key + customer)
  const sign = await computeMD5(`${param}${signingKey}${customerCode}`);

  const body = new URLSearchParams({
    customer: customerCode,
    sign: sign.toUpperCase(),
    param,
  });

  console.log(`Querying Kuaidi100: courier=${courierCode}, num=${trackingNumber}, customer=${customerCode.substring(0,4)}..., sign=${sign.toUpperCase().substring(0,8)}...`);

  const response = await fetch(
    "https://poll.kuaidi100.com/poll/query.do",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(`Kuaidi100 API error: ${response.status}`);
  }

  return await response.json();
}

// Auto-detect courier company using Kuaidi100
async function autoDetectCourier(
  trackingNumber: string,
  authKey: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.kuaidi100.com/autonumber/autoComNum?resultv2=1&text=${encodeURIComponent(trackingNumber)}&key=${authKey}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error("Autodetect error:", response.status);
      await response.text();
      return null;
    }

    const data = await response.json();
    console.log("Autodetect result:", JSON.stringify(data));
    if (data.auto && data.auto.length > 0) {
      return (data.auto[0].comCode || data.auto[0].comcode || "").toLowerCase() || null;
    }
    return null;
  } catch (err) {
    console.error("Autodetect error:", err);
    return null;
  }
}

// Fallback inference from common tracking number prefixes/patterns
function inferCourierCandidates(trackingNumber: string): string[] {
  const value = (trackingNumber || "").trim().toUpperCase();

  if (value.startsWith("YT")) return ["yuantong", "yto", "yt"];
  if (value.startsWith("SF")) return ["shunfeng", "sf"];
  if (value.startsWith("YD")) return ["yunda", "yd"];
  if (value.startsWith("ZT")) return ["zhongtong", "zto", "zt"];
  if (value.startsWith("ST")) return ["shentong", "sto", "st"];
  if (value.startsWith("JD")) return ["jd", "jdwl"];
  if (value.startsWith("EMS") || /^E[A-Z]\d{9}CN$/.test(value)) return ["ems"];

  return [];
}

// MD5 hash using Web Crypto with SHA-256 fallback approach
// Deno edge runtime doesn't support MD5 via crypto.subtle, so we use a pure JS implementation
async function computeMD5(input: string): Promise<string> {
  // Pure JavaScript MD5 implementation
  function md5(string: string): string {
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
      a = (a + q + x + t) & 0xFFFFFFFF;
      return (((a << s) | (a >>> (32 - s))) + b) & 0xFFFFFFFF;
    }
    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

    const bytes: number[] = [];
    for (let i = 0; i < string.length; i++) {
      const code = string.charCodeAt(i);
      if (code < 0x80) { bytes.push(code); }
      else if (code < 0x800) { bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F)); }
      else { bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F)); }
    }

    const n = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const bitLen = n * 8;
    bytes.push(bitLen & 0xFF, (bitLen >> 8) & 0xFF, (bitLen >> 16) & 0xFF, (bitLen >> 24) & 0xFF, 0, 0, 0, 0);

    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

    for (let i = 0; i < bytes.length; i += 64) {
      const w: number[] = [];
      for (let j = 0; j < 16; j++) {
        w[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
      }
      let aa = a, bb = b, cc = c, dd = d;
      a = ff(a,b,c,d,w[0],7,-680876936); d = ff(d,a,b,c,w[1],12,-389564586); c = ff(c,d,a,b,w[2],17,606105819); b = ff(b,c,d,a,w[3],22,-1044525330);
      a = ff(a,b,c,d,w[4],7,-176418897); d = ff(d,a,b,c,w[5],12,1200080426); c = ff(c,d,a,b,w[6],17,-1473231341); b = ff(b,c,d,a,w[7],22,-45705983);
      a = ff(a,b,c,d,w[8],7,1770035416); d = ff(d,a,b,c,w[9],12,-1958414417); c = ff(c,d,a,b,w[10],17,-42063); b = ff(b,c,d,a,w[11],22,-1990404162);
      a = ff(a,b,c,d,w[12],7,1804603682); d = ff(d,a,b,c,w[13],12,-40341101); c = ff(c,d,a,b,w[14],17,-1502002290); b = ff(b,c,d,a,w[15],22,1236535329);
      a = gg(a,b,c,d,w[1],5,-165796510); d = gg(d,a,b,c,w[6],9,-1069501632); c = gg(c,d,a,b,w[11],14,643717713); b = gg(b,c,d,a,w[0],20,-373897302);
      a = gg(a,b,c,d,w[5],5,-701558691); d = gg(d,a,b,c,w[10],9,38016083); c = gg(c,d,a,b,w[15],14,-660478335); b = gg(b,c,d,a,w[4],20,-405537848);
      a = gg(a,b,c,d,w[9],5,568446438); d = gg(d,a,b,c,w[14],9,-1019803690); c = gg(c,d,a,b,w[3],14,-187363961); b = gg(b,c,d,a,w[8],20,1163531501);
      a = gg(a,b,c,d,w[13],5,-1444681467); d = gg(d,a,b,c,w[2],9,-51403784); c = gg(c,d,a,b,w[7],14,1735328473); b = gg(b,c,d,a,w[12],20,-1926607734);
      a = hh(a,b,c,d,w[5],4,-378558); d = hh(d,a,b,c,w[8],11,-2022574463); c = hh(c,d,a,b,w[11],16,1839030562); b = hh(b,c,d,a,w[14],23,-35309556);
      a = hh(a,b,c,d,w[1],4,-1530992060); d = hh(d,a,b,c,w[4],11,1272893353); c = hh(c,d,a,b,w[7],16,-155497632); b = hh(b,c,d,a,w[10],23,-1094730640);
      a = hh(a,b,c,d,w[13],4,681279174); d = hh(d,a,b,c,w[0],11,-358537222); c = hh(c,d,a,b,w[3],16,-722521979); b = hh(b,c,d,a,w[6],23,76029189);
      a = hh(a,b,c,d,w[9],4,-640364487); d = hh(d,a,b,c,w[12],11,-421815835); c = hh(c,d,a,b,w[15],16,530742520); b = hh(b,c,d,a,w[2],23,-995338651);
      a = ii(a,b,c,d,w[0],6,-198630844); d = ii(d,a,b,c,w[7],10,1126891415); c = ii(c,d,a,b,w[14],15,-1416354905); b = ii(b,c,d,a,w[5],21,-57434055);
      a = ii(a,b,c,d,w[12],6,1700485571); d = ii(d,a,b,c,w[3],10,-1894986606); c = ii(c,d,a,b,w[10],15,-1051523); b = ii(b,c,d,a,w[1],21,-2054922799);
      a = ii(a,b,c,d,w[8],6,1873313359); d = ii(d,a,b,c,w[15],10,-30611744); c = ii(c,d,a,b,w[6],15,-1560198380); b = ii(b,c,d,a,w[13],21,1309151649);
      a = ii(a,b,c,d,w[4],6,-145523070); d = ii(d,a,b,c,w[11],10,-1120210379); c = ii(c,d,a,b,w[2],15,718787259); b = ii(b,c,d,a,w[9],21,-343485551);
      a = (a + aa) & 0xFFFFFFFF; b = (b + bb) & 0xFFFFFFFF; c = (c + cc) & 0xFFFFFFFF; d = (d + dd) & 0xFFFFFFFF;
    }

    const hex = (n: number) => {
      let s = "";
      for (let i = 0; i < 4; i++) s += ("0" + ((n >> (i * 8)) & 0xFF).toString(16)).slice(-2);
      return s;
    };
    return hex(a) + hex(b) + hex(c) + hex(d);
  }

  return md5(input);
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
    const rateLimitResponse = await enforceRateLimit(req, "kuaidi100-track");
    if (rateLimitResponse) return rateLimitResponse;

    const { tracking_number, courier_code } = await req.json();

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

    // CACHE-FIRST: Check shipment_tracking_cache before calling paid Kuaidi100 API
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
              courier_name: cached.courier_name || "",
              status: cached.status || "Unknown",
              state_code: "0",
              is_delivered: cached.is_delivered || false,
              events: cached.events || [],
              warehouse_detection: {
                detected: false,
                warehouse_name: null,
                warehouse_type: null,
                message: null,
              },
              query_time: new Date().toISOString(),
              cached: true,
            };
            return new Response(JSON.stringify(cachedResult), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.log(`Cache STALE for ${cleanNumber} (age: ${Math.round(ageMs / 1000)}s), calling Kuaidi100 API`);
        } else {
          console.log(`Cache MISS for ${cleanNumber}, calling Kuaidi100 API`);
        }
      }
    } catch (cacheErr) {
      console.error("Cache lookup failed (non-fatal):", cacheErr);
    }

    // KUAIDI100_API_KEY = user's "key" = authorization/customer code
    // KUAIDI100_CUSTOMER_ID = user's "secret" = signing key
    const KUAIDI100_AUTH_KEY = Deno.env.get("KUAIDI100_API_KEY");
    const KUAIDI100_SIGN_KEY = Deno.env.get("KUAIDI100_CUSTOMER_ID");
    const GOOGLE_TRANSLATE_API_KEY = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");

    if (!KUAIDI100_AUTH_KEY || !KUAIDI100_SIGN_KEY) {
      console.log("Credentials missing");
    } else {
      console.log(`Credentials: API_KEY(len=${KUAIDI100_AUTH_KEY.length}, prefix=${KUAIDI100_AUTH_KEY.substring(0,4)}), CUSTOMER_ID(len=${KUAIDI100_SIGN_KEY.length}, prefix=${KUAIDI100_SIGN_KEY.substring(0,4)})`);
    }
    if (!KUAIDI100_AUTH_KEY || !KUAIDI100_SIGN_KEY) {
      return new Response(
        JSON.stringify({ error: "Courier tracking service is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inferredCandidates = inferCourierCandidates(cleanNumber);

    // Auto-detect courier if not provided
    let detectedCourier = courier_code
      ? sanitizeString(courier_code, 20).toLowerCase()
      : null;

    if (!detectedCourier) {
      detectedCourier = await autoDetectCourier(cleanNumber, KUAIDI100_AUTH_KEY);
      // If first key fails, try the other one (keys may be swapped)
      if (!detectedCourier) {
        detectedCourier = await autoDetectCourier(cleanNumber, KUAIDI100_SIGN_KEY);
      }
      // Final fallback: infer from tracking number pattern
      if (!detectedCourier && inferredCandidates.length > 0) {
        detectedCourier = inferredCandidates[0];
      }
    }

    if (!detectedCourier) {
      return new Response(
        JSON.stringify({
          error: "Could not identify the courier company. Please try again or contact support.",
          suggestion: "Common couriers: yuantong (YT), shunfeng (SF), yunda, zhongtong, shentong, jd, ems",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Kuaidi100
    // KUAIDI100_SIGN_KEY = KUAIDI100_CUSTOMER_ID env = the customer/company code (long hex)
    // KUAIDI100_AUTH_KEY = KUAIDI100_API_KEY env = the signing/authorization key (short)
    // customer param = customer ID, sign = MD5(param + key + customer)
    let trackingData = await queryKuaidi100(
      cleanNumber,
      detectedCourier,
      KUAIDI100_SIGN_KEY,
      KUAIDI100_AUTH_KEY
    );

    console.log("Kuaidi100 response state:", trackingData.state, "returnCode:", trackingData.returnCode, "message:", trackingData.message);

    // Handle auth error - try swapped credentials if first attempt fails
    if (trackingData.returnCode === "600" || trackingData.returnCode === "601") {
      console.log("Auth error, trying swapped credentials...");
      const swappedData = await queryKuaidi100(
        cleanNumber,
        detectedCourier,
        KUAIDI100_AUTH_KEY,
        KUAIDI100_SIGN_KEY
      );

      if (swappedData.returnCode !== "600" && swappedData.returnCode !== "601") {
        trackingData = swappedData;
      }
    }

    // If no data and courier was inferred, retry with alternative inferred courier codes
    if (
      (trackingData.returnCode === "400" || trackingData.result === false) &&
      !courier_code &&
      inferredCandidates.length > 1
    ) {
      for (const candidate of inferredCandidates.slice(1)) {
        const altData = await queryKuaidi100(
          cleanNumber,
          candidate,
          KUAIDI100_SIGN_KEY,
          KUAIDI100_AUTH_KEY
        );
        if (altData.returnCode !== "400" && altData.result !== false) {
          detectedCourier = candidate;
          trackingData = altData;
          break;
        }
      }
    }

    if (trackingData.returnCode === "400" || trackingData.result === false) {
      return new Response(
        JSON.stringify({
          error: "No tracking data found for this number",
          details: trackingData.message || "The tracking number may be invalid or not yet in the system",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await processTrackingResult(trackingData, cleanNumber, detectedCourier, GOOGLE_TRANSLATE_API_KEY);
  } catch (err) {
    console.error("Kuaidi100 tracking error:", err);
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve tracking information",
        details: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processTrackingResult(
  trackingData: any,
  cleanNumber: string,
  detectedCourier: string,
  googleApiKey: string | undefined
): Promise<Response> {
  // Extract events
  const rawEvents = (trackingData.data || []).map((item: any) => ({
    context: item.context || "",
    time: item.time || item.ftime || "",
    status: item.status || "",
  }));

  // Translate events to English
  let translatedEvents = rawEvents;
  if (rawEvents.length > 0) {
    const chineseTexts = rawEvents.map((e: any) => e.context);
    const translations = await translateToEnglish(chineseTexts, googleApiKey || null);
    translatedEvents = rawEvents.map((e: any, i: number) => ({
      ...e,
      context_original: e.context,
      context: translations[i] || e.context,
    }));
  }

  // Detect warehouse delivery (use original Chinese text for detection)
  const warehouseDetection = detectWarehouseDelivery(rawEvents);

  const stateMap: Record<string, string> = {
    "0": "In Transit",
    "1": "Picked Up",
    "2": "Issue",
    "3": "Delivered",
    "4": "Returned",
    "5": "Delivering",
    "6": "Returning",
    "7": "Transferred",
  };

  const result = {
    tracking_number: cleanNumber,
    courier_code: detectedCourier,
    courier_name: trackingData.com || detectedCourier,
    status: stateMap[trackingData.state] || "Unknown",
    state_code: trackingData.state,
    is_delivered: trackingData.state === "3",
    events: translatedEvents,
    warehouse_detection: {
      detected: warehouseDetection.detected,
      warehouse_name: warehouseDetection.warehouse?.name || null,
      warehouse_type: warehouseDetection.warehouse?.type || null,
      message: warehouseDetection.warehouse?.message || null,
    },
    raw_status: trackingData.status,
    query_time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}