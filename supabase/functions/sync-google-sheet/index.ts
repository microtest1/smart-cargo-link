import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SheetRow {
  tracking_number: string;
  customer_name?: string;
  product_name: string;
  product_details?: string;
  quantity_received?: number;
  container_name?: string;
  customer_user_code?: string;
  status?: string;
  fulfillment_date?: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  cbm?: number;
  cbm_cost?: number;
  notes?: string;
}

/**
 * Sync shipment data from a Google Sheet (published as CSV/JSON) into warehouse_submissions.
 * 
 * The Google Sheet must be published to the web as CSV.
 * URL format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
 * 
 * Expected columns (case-insensitive, order doesn't matter):
 * tracking_number, customer_name, product_name, product_details, quantity_received,
 * container_name, customer_user_code, status, fulfillment_date, length_cm, width_cm,
 * height_cm, cbm, cbm_cost, notes
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth check - admin/manager only
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is admin/manager
    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "manager"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sheet_url, rows } = body;

    let dataRows: SheetRow[] = [];

    if (rows && Array.isArray(rows)) {
      // Direct data submission (from admin UI)
      dataRows = rows;
    } else if (sheet_url) {
      // Fetch from Google Sheets published CSV
      const csvResponse = await fetch(sheet_url);
      if (!csvResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch Google Sheet. Ensure it is published to the web." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const csvText = await csvResponse.text();
      dataRows = parseCSV(csvText);
    } else {
      return new Response(
        JSON.stringify({ error: "Provide either 'sheet_url' or 'rows' in the request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dataRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid rows found in the data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into warehouse_submissions
    let inserted = 0;
    let updated = 0;
    let errors: string[] = [];

    for (const row of dataRows) {
      if (!row.tracking_number || !row.product_name) {
        errors.push(`Skipped row: missing tracking_number or product_name`);
        continue;
      }

      const sanitizedTracking = row.tracking_number.replace(/['"\\]/g, "").trim().substring(0, 100);
      const sanitizedProduct = row.product_name.replace(/['"\\]/g, "").trim().substring(0, 200);

      // Check if entry already exists
      const { data: existing } = await serviceClient
        .from("warehouse_submissions")
        .select("id")
        .eq("tracking_number", sanitizedTracking)
        .maybeSingle();

      const record = {
        tracking_number: sanitizedTracking,
        product_name: sanitizedProduct,
        product_details: row.product_details?.substring(0, 500) || null,
        customer_name: row.customer_name?.substring(0, 200) || null,
        customer_user_code: row.customer_user_code?.trim() || null,
        container_name: row.container_name?.trim() || null,
        quantity_received: Math.max(1, Number(row.quantity_received) || 1),
        status: row.status?.trim() || "received",
        fulfillment_date: row.fulfillment_date || new Date().toISOString().split("T")[0],
        length_cm: Number(row.length_cm) || 0,
        width_cm: Number(row.width_cm) || 0,
        height_cm: Number(row.height_cm) || 0,
        cbm: row.cbm != null ? Number(row.cbm) : null,
        cbm_cost: row.cbm_cost != null ? Number(row.cbm_cost) : null,
        notes: row.notes?.substring(0, 1000) || null,
        visible_to_customer: true,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await serviceClient
          .from("warehouse_submissions")
          .update(record)
          .eq("id", existing.id);

        if (updateError) {
          errors.push(`Update failed for ${sanitizedTracking}: ${updateError.message}`);
        } else {
          updated++;
        }
      } else {
        const { error: insertError } = await serviceClient
          .from("warehouse_submissions")
          .insert(record);

        if (insertError) {
          errors.push(`Insert failed for ${sanitizedTracking}: ${insertError.message}`);
        } else {
          inserted++;
        }
      }
    }

    // Audit log
    await serviceClient.rpc("log_audit_event", {
      p_action: "google_sheet_sync",
      p_entity_type: "warehouse_submissions",
      p_details: { inserted, updated, errors: errors.length, total_rows: dataRows.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_rows: dataRows.length,
          inserted,
          updated,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse CSV text into SheetRow objects.
 * Handles quoted fields and various delimiters.
 */
function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[\s\-\/]/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};

    headers.forEach((header, idx) => {
      obj[header] = values[idx]?.trim() || "";
    });

    // Map common column name variants
    const trackingNumber =
      obj["tracking_number"] || obj["tracking_no"] || obj["tracking"] || obj["shipment_id"] || "";
    const productName =
      obj["product_name"] || obj["product"] || obj["item"] || obj["item_description"] || obj["description"] || "";

    if (!trackingNumber || !productName) continue;

    rows.push({
      tracking_number: trackingNumber,
      customer_name: obj["customer_name"] || obj["customer"] || obj["name"] || undefined,
      product_name: productName,
      product_details: obj["product_details"] || obj["details"] || obj["item_details"] || undefined,
      quantity_received: Number(obj["quantity_received"] || obj["quantity"] || obj["qty"]) || 1,
      container_name: obj["container_name"] || obj["container"] || obj["container_number"] || undefined,
      customer_user_code: obj["customer_user_code"] || obj["user_code"] || obj["aef_code"] || undefined,
      status: obj["status"] || obj["shipment_status"] || "received",
      fulfillment_date: obj["fulfillment_date"] || obj["date_received"] || obj["date"] || undefined,
      length_cm: Number(obj["length_cm"] || obj["length"]) || undefined,
      width_cm: Number(obj["width_cm"] || obj["width"]) || undefined,
      height_cm: Number(obj["height_cm"] || obj["height"]) || undefined,
      cbm: Number(obj["cbm"] || obj["volume"]) || undefined,
      cbm_cost: Number(obj["cbm_cost"] || obj["cost"]) || undefined,
      notes: obj["notes"] || obj["remarks"] || undefined,
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
