import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import * as XLSX from "npm:@e965/xlsx@0.20.3";
import { calculateFreightByCbm, getActiveCbmPricing } from "../_shared/pricing.ts";

const BodySchema = z.object({
  fileBase64: z.string().min(20).max(20_000_000),
  filename: z.string().min(1).max(255).regex(/\.(xlsx|xlsm|xls|csv)$/i),
  confirm: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  container: z.object({
    internalNumber: z.string().trim().max(60).optional(),
    shippingNumber: z.string().trim().max(60).optional(),
    sealNumber: z.string().trim().max(60).optional(),
    type: z.string().trim().max(60).optional(),
    loadingDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    origin: z.string().trim().max(60).optional(),
    destination: z.string().trim().max(60).optional(),
  }).partial().optional(),
});

type ImportRow = {
  sourceRow: number; sourceReference: string; sourceDate: string; receiptNumber: string;
  customerName: string; customerPhone: string; customerCode: string; productName: string;
  quantity: number; cbm: number; weightKg: number; notes: string; status: string; messages: string[];
  estimatedFreight?: number;
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function text(v: unknown): string { return v == null ? "" : String(v).trim(); }
function number(v: unknown): number { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^0-9]/g, "");
  if (/^0\d{9}$/.test(d)) d = `233${d.slice(1)}`;
  return /^233\d{9}$/.test(d) ? d : null;
}
function base64Bytes(input: string): Uint8Array {
  const clean = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const binary = atob(clean); const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
async function fingerprint(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function isoDate(value: string): string {
  const trimmed = value.trim();
  const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

// Flexible column mapping: use header labels when present, otherwise the classic official layout.
const DEFAULT_MAP = { reference: 0, date: 1, receipt: 2, name: 3, phone: 4, product: 5, quantity: 6, cbm: 7, weight: 8, notes: 9, code: -1 };
type ColumnMap = typeof DEFAULT_MAP;
const HEADER_PATTERNS: [keyof ColumnMap, RegExp][] = [
  ["code", /(aef|shipping\s*mark|customer\s*code|mark)/i],
  ["name", /(customer|client|收货人|名字|name)/i],
  ["phone", /(phone|tel|mobile|contact|电话|号码)/i],
  ["product", /(product|goods|description|item|货物|品名)/i],
  ["quantity", /(qty|quantity|ctn|carton|pieces|件数|箱数)/i],
  ["cbm", /(cbm|volume|m3|立方|方数)/i],
  ["weight", /(weight|kg|gross|重量)/i],
  ["receipt", /(receipt|invoice\s*no|收据)/i],
  ["date", /(date|日期)/i],
  ["reference", /(no\.?$|s\/?n|serial|序号|reference)/i],
  ["notes", /(note|remark|备注)/i],
];

function detectLayout(matrix: unknown[][]): { map: ColumnMap; dataStart: number } {
  for (let i = 0; i < Math.min(matrix.length, 8); i += 1) {
    const cells = (matrix[i] ?? []).map((c) => text(c));
    const hasCbm = cells.some((c) => /cbm|volume|立方|m3/i.test(c));
    const hasQty = cells.some((c) => /qty|quantity|ctn|carton|件数|箱数/i.test(c));
    if (!hasCbm || !hasQty) continue;
    const map: ColumnMap = { ...DEFAULT_MAP, code: -1 };
    const taken = new Set<number>();
    for (const [key, pattern] of HEADER_PATTERNS) {
      const index = cells.findIndex((c, idx) => c && !taken.has(idx) && pattern.test(c));
      if (index >= 0) { map[key] = index; taken.add(index); }
    }
    return { map, dataStart: i + 1 };
  }
  return { map: { ...DEFAULT_MAP }, dataStart: 2 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Import service is not configured" }, 500);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.slice(7);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "manager"]);
    if (!roles?.length) return json({ error: "Administrator access required" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const override = parsed.data.container ?? {};
    const bytes = base64Bytes(parsed.data.fileBase64);
    if (bytes.length > 12_000_000) return json({ error: "Workbook is too large" }, 413);
    const hash = await fingerprint(bytes);
    const admin = createClient(url, service);
    const { data: existing } = await admin.from("packing_list_imports").select("id,status,packing_list_id,container_id").eq("fingerprint", hash).maybeSingle();
    if (existing) return json({ error: "This workbook has already been imported", duplicate: existing }, 409);

    const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return json({ error: "Workbook has no readable worksheet" }, 400);
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    if (matrix.length < 2) return json({ error: "Packing list has no cargo rows" }, 400);

    // Container metadata: read the official header line when present, otherwise use admin-supplied values.
    const metadata = matrix.slice(0, 3).map((r) => (r ?? []).map((c) => text(c)).join(" ")).join(" ");
    const containerMatch = metadata.match(/CNTR:\s*([^,\s]+)/i);
    const sealMatch = metadata.match(/Seal\s*No\.?\s*:\s*([^,\s]+)/i);
    const typeMatch = metadata.match(/Type:\s*([^,\n\r]+)/i);
    const dateMatch = metadata.match(/Loading\s*time:\s*([0-9./-]+)/i);
    const shippingNumber = override.shippingNumber || (containerMatch ? containerMatch[1] : "");
    const sealNumber = override.sealNumber || (sealMatch ? sealMatch[1] : "");
    const containerType = override.type || (typeMatch ? typeMatch[1].trim() : "40HQ");
    const loadingDate = override.loadingDate || (dateMatch ? isoDate(dateMatch[1]) : "");
    if (!shippingNumber || !loadingDate) {
      return json({ error: "Container details are missing. Enter the shipping container number and loading date, then upload again." }, 400);
    }

    const { map, dataStart } = detectLayout(matrix);
    const rows: ImportRow[] = [];
    for (let i = dataStart; i < matrix.length; i += 1) {
      const r = matrix[i] ?? [];
      const cell = (index: number) => (index >= 0 ? text(r[index]) : "");
      const ref = cell(map.reference); const product = cell(map.product); const name = cell(map.name);
      const isTotal = /total/i.test(ref) || /total/i.test(name) || /^total$/i.test(product);
      if ((!ref && !product && !name) || isTotal) continue;
      const phone = cell(map.phone); const normalized = normalizePhone(phone); const messages: string[] = [];
      const qty = number(r[map.quantity]); const cbm = number(r[map.cbm]); const kg = number(r[map.weight]);
      if (!phone) messages.push("Missing phone number"); else if (!normalized) messages.push("Phone requires manual review");
      if (!kg) messages.push("Missing or zero weight"); if (!cbm) messages.push("Zero CBM");
      if (!product) messages.push("Missing product name");
      rows.push({ sourceRow: i + 1, sourceReference: ref, sourceDate: cell(map.date), receiptNumber: cell(map.receipt), customerName: name, customerPhone: phone, customerCode: cell(map.code), productName: product, quantity: qty, cbm, weightKg: kg, notes: cell(map.notes), status: messages.length ? "needs_review" : "valid", messages });
    }
    if (!rows.length) return json({ error: "No cargo rows were found" }, 400);
    if (rows.some((r) => !r.productName || r.quantity < 0 || r.cbm < 0 || r.weightKg < 0)) return json({ error: "Workbook contains invalid cargo values" }, 400);
    const totals = rows.reduce((a, r) => ({ cartons: a.cartons + r.quantity, cbm: a.cbm + r.cbm, weightKg: a.weightKg + r.weightKg }), { cartons: 0, cbm: 0, weightKg: 0 });

    // Internal container number: reuse the existing container for this shipping number, else generate one.
    let internalNumber = override.internalNumber || "";
    if (!internalNumber) {
      const { data: known } = await admin.from("containers").select("container_number").eq("shipping_container_number", shippingNumber).maybeSingle();
      internalNumber = known?.container_number || "";
    }
    if (!internalNumber) {
      const { data: generated } = await admin.rpc("generate_container_number");
      internalNumber = typeof generated === "string" && generated ? generated : `AEF-CN-${loadingDate.slice(0, 4)}-${loadingDate.slice(5, 7)}-${shippingNumber.slice(-3).toUpperCase()}`;
    }

    // Centralized official pricing: the imported CBM column is the official CBM.
    const pricing = await getActiveCbmPricing(admin, "sea_freight");
    for (const r of rows) r.estimatedFreight = calculateFreightByCbm(r.cbm, pricing).freightAmount;
    const customerTotals = new Map<string, { key: string; customerName: string; customerPhone: string; cbm: number; cartons: number }>();
    for (const r of rows) {
      const key = normalizePhone(r.customerPhone) || r.customerName.toLowerCase() || `row:${r.sourceRow}`;
      const current = customerTotals.get(key) ?? { key, customerName: r.customerName, customerPhone: r.customerPhone, cbm: 0, cartons: 0 };
      current.cbm += r.cbm; current.cartons += r.quantity;
      customerTotals.set(key, current);
    }
    // One charge per customer from summed CBM — avoids per-row rounding drift.
    const customers = Array.from(customerTotals.values()).map((c) => ({
      ...c, estimatedFreight: calculateFreightByCbm(c.cbm, pricing).freightAmount,
    }));
    const preview = { fingerprint: hash, filename: parsed.data.filename, sheetName, container: { internalNumber, shippingNumber, sealNumber, type: containerType, loadingDate, origin: override.origin || "China", destination: override.destination || "Ghana" }, totals: { ...totals, estimatedFreight: calculateFreightByCbm(totals.cbm, pricing).freightAmount }, pricing, customers, rowCount: rows.length, customerGroups: customerTotals.size, reviewRows: rows.filter((r) => r.messages.length).length, invalidContacts: rows.filter((r) => !normalizePhone(r.customerPhone)).length, rows };
    if (!parsed.data.confirm) return json({ success: true, preview });
    const { data: result, error: commitError } = await admin.rpc("commit_packing_list_import_service", { p_actor: user.id, p_fingerprint: hash, p_filename: parsed.data.filename, p_sheet_name: sheetName, p_container: preview.container, p_rows: rows });
    if (commitError) throw commitError;
    return json({ success: true, result, smsRequested: parsed.data.sendSms });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Import failed";
    console.error("packing-list import failed", message);
    return json({ error: message }, 500);
  }
});
