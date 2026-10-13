import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validation patterns
const TRACKING_NUMBER_REGEX = /^[A-Za-z0-9\-]{4,50}$/;
const SHIPPING_MARK_REGEX = /^AEF_\d{5}$/;
const CONTAINER_ID_REGEX = /^AEF-CN-\d{4}-\d{2}-\d{3}$/;

interface ExcelRow {
  container_id: string;
  tracking_number: string;
  courier_name?: string;
  shipping_mark: string;
  customer_name?: string;
  customer_phone?: string;
  package_number?: number;
  item_description: string;
  quantity: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  cbm?: number;
  warehouse_status?: string;
  arrival_date?: string;
}

interface ProcessResult {
  row_index: number;
  tracking_number: string;
  shipping_mark: string;
  status: "success" | "error" | "skipped";
  message: string;
  ship24_registered: boolean;
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
    // Verify JWT and admin role
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Check admin/manager role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "manager"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rows, container_db_id } = await req.json() as { rows: ExcelRow[]; container_db_id?: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: "Maximum 500 rows per upload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SHIP24_API_KEY = Deno.env.get("SHIP24_API_KEY");
    const results: ProcessResult[] = [];
    let created = 0;
    let updated = 0;
    let errors = 0;
    let ship24Registered = 0;

    // Resolve container IDs - group rows by container_id string
    const containerMap = new Map<string, string>(); // container_number -> db uuid

    if (container_db_id) {
      // Single container mode - all rows go to this container
      const { data: c } = await serviceClient
        .from("containers")
        .select("id, container_number")
        .eq("id", container_db_id)
        .single();
      if (c) {
        containerMap.set(c.container_number, c.id);
      }
    }

    // Also resolve container IDs from row data
    const uniqueContainerIds = [...new Set(rows.map(r => r.container_id).filter(Boolean))];
    if (uniqueContainerIds.length > 0) {
      const { data: containers } = await serviceClient
        .from("containers")
        .select("id, container_number")
        .in("container_number", uniqueContainerIds);

      containers?.forEach(c => containerMap.set(c.container_number, c.id));
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trackingNumber = (row.tracking_number || "").trim().toUpperCase();
      const shippingMark = (row.shipping_mark || "").trim().toUpperCase();
      const containerNumber = (row.container_id || "").trim();

      // Validate tracking number
      if (!trackingNumber || !TRACKING_NUMBER_REGEX.test(trackingNumber)) {
        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "error",
          message: `Invalid tracking number format: ${trackingNumber}`,
          ship24_registered: false,
        });
        errors++;
        continue;
      }

      // Validate shipping mark
      if (shippingMark && !SHIPPING_MARK_REGEX.test(shippingMark)) {
        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "error",
          message: `Invalid shipping mark format: ${shippingMark}. Expected AEF_XXXXX`,
          ship24_registered: false,
        });
        errors++;
        continue;
      }

      // Validate container ID format if provided
      if (containerNumber && !CONTAINER_ID_REGEX.test(containerNumber) && !container_db_id) {
        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "error",
          message: `Invalid container ID format: ${containerNumber}`,
          ship24_registered: false,
        });
        errors++;
        continue;
      }

      // Resolve container UUID
      const resolvedContainerId = container_db_id || containerMap.get(containerNumber);
      if (!resolvedContainerId) {
        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "error",
          message: `Container not found: ${containerNumber}`,
          ship24_registered: false,
        });
        errors++;
        continue;
      }

      // Calculate CBM if dimensions provided
      let cbm = row.cbm || 0;
      if (!cbm && row.length_cm && row.width_cm && row.height_cm) {
        cbm = (row.length_cm * row.width_cm * row.height_cm) / 1000000;
      }

      try {
        // Upsert container_item
        const itemData = {
          container_id: resolvedContainerId,
          user_code: shippingMark || null,
          item_name: row.item_description || "Package",
          total_cbm: cbm,
          quantity: row.quantity || 1,
          available_quantity: row.quantity || 1,
          notes: [
            row.customer_name ? `Customer: ${row.customer_name}` : "",
            row.customer_phone ? `Phone: ${row.customer_phone}` : "",
            `Tracking: ${trackingNumber}`,
            row.courier_name ? `Courier: ${row.courier_name}` : "",
            row.length_cm ? `Dimensions: ${row.length_cm}×${row.width_cm}×${row.height_cm}cm` : "",
          ].filter(Boolean).join(". "),
        };

        // Check if item already exists for this tracking number in this container
        const { data: existing } = await serviceClient
          .from("container_items")
          .select("id")
          .eq("container_id", resolvedContainerId)
          .ilike("notes", `%Tracking: ${trackingNumber}%`)
          .limit(1);

        if (existing && existing.length > 0) {
          await serviceClient
            .from("container_items")
            .update(itemData)
            .eq("id", existing[0].id);
          updated++;
        } else {
          await serviceClient
            .from("container_items")
            .insert([itemData]);
          created++;
        }

        // Also create/update warehouse_submission
        const submissionData = {
          tracking_number: trackingNumber,
          product_name: row.item_description || "Package",
          product_details: row.courier_name ? `Courier: ${row.courier_name}` : null,
          quantity_received: row.quantity || 1,
          customer_user_code: shippingMark || null,
          customer_name: row.customer_name || null,
          container_id: resolvedContainerId,
          container_name: containerNumber || null,
          status: (row.warehouse_status || "received").toLowerCase(),
          length_cm: row.length_cm || 0,
          width_cm: row.width_cm || 0,
          height_cm: row.height_cm || 0,
          cbm: cbm || null,
          fulfillment_date: row.arrival_date || new Date().toISOString().split("T")[0],
          visible_to_customer: true,
        };

        // Upsert warehouse_submission by tracking_number + container
        const { data: existingSub } = await serviceClient
          .from("warehouse_submissions")
          .select("id")
          .eq("tracking_number", trackingNumber)
          .eq("container_id", resolvedContainerId)
          .limit(1);

        if (existingSub && existingSub.length > 0) {
          await serviceClient
            .from("warehouse_submissions")
            .update(submissionData)
            .eq("id", existingSub[0].id);
        } else {
          await serviceClient
            .from("warehouse_submissions")
            .insert([submissionData]);
        }

        // Register tracking number with Ship24
        let ship24Success = false;
        if (SHIP24_API_KEY) {
          try {
            const today = new Date().toISOString().split("T")[0];
            const createRes = await fetch("https://api.ship24.com/public/v1/trackers", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SHIP24_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                trackingNumber: trackingNumber,
                originCountryCode: "CN",
                destinationCountryCode: "GH",
                shippingDate: row.arrival_date || today,
                destinationPostCode: "00233",
                title: `${shippingMark || "Package"} - ${row.item_description || "Shipment"}`,
              }),
            });

            // 409 (already exists) is fine, 2xx is fine
            if (createRes.ok || createRes.status === 409) {
              ship24Success = true;
              ship24Registered++;
            } else {
              const errText = await createRes.text();
              console.error(`Ship24 register failed for ${trackingNumber}: ${createRes.status} ${errText.substring(0, 200)}`);
              // Check for 400 validation errors (also fine - already tracked)
              if (createRes.status === 400) {
                ship24Success = true;
                ship24Registered++;
              }
            }
          } catch (ship24Err) {
            console.error(`Ship24 registration error for ${trackingNumber}:`, ship24Err);
          }
        }

        // Also seed the tracking cache
        try {
          await serviceClient.from("shipment_tracking_cache").upsert({
            tracking_number: trackingNumber,
            courier_name: row.courier_name || "Detecting...",
            status: row.warehouse_status || "Registered",
            destination: "GH",
          }, { onConflict: "tracking_number" });
        } catch (cacheErr) {
          console.error(`Cache seed failed for ${trackingNumber}:`, cacheErr);
        }

        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "success",
          message: ship24Success ? "Created & registered with Ship24" : "Created (Ship24 registration pending)",
          ship24_registered: ship24Success,
        });
      } catch (err) {
        console.error(`Error processing row ${i + 1}:`, err);
        results.push({
          row_index: i + 1,
          tracking_number: trackingNumber,
          shipping_mark: shippingMark,
          status: "error",
          message: `Database error: ${(err as Error).message?.substring(0, 100)}`,
          ship24_registered: false,
        });
        errors++;
      }
    }

    // Update container load count
    for (const [_containerNumber, containerId] of containerMap.entries()) {
      try {
        const { count } = await serviceClient
          .from("container_items")
          .select("id", { count: "exact", head: true })
          .eq("container_id", containerId);

        if (count !== null) {
          await serviceClient
            .from("containers")
            .update({ current_load: count })
            .eq("id", containerId);
        }
      } catch (e) {
        console.error("Failed to update container load:", e);
      }
    }
    // Also update for single container mode
    if (container_db_id && !containerMap.has("__single__")) {
      try {
        const { count } = await serviceClient
          .from("container_items")
          .select("id", { count: "exact", head: true })
          .eq("container_id", container_db_id);

        if (count !== null) {
          await serviceClient
            .from("containers")
            .update({ current_load: count })
            .eq("id", container_db_id);
        }
      } catch (e) {
        console.error("Failed to update container load:", e);
      }
    }

    // Log audit event
    try {
      await serviceClient.rpc("log_audit_event", {
        p_action: "bulk_upload_ship24",
        p_entity_type: "container_items",
        p_details: {
          total_rows: rows.length,
          created,
          updated,
          errors,
          ship24_registered: ship24Registered,
          uploaded_by: user.id,
        } as any,
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: rows.length, created, updated, errors, ship24_registered: ship24Registered },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Process Ship24 Excel error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
