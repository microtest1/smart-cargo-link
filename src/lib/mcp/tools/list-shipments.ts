/// <reference path="../process.d.ts" />
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_shipments",
  title: "List my shipments",
  description:
    "List shipments belonging to the signed-in user. Optionally filter by status (pending, in_transit, delivered, etc.).",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Optional status filter."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max shipments to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("shipments")
      .select("id, tracking_number, status, product, estimated_delivery, container_id, service_type, vehicle_identifier, vehicle_model, vehicle_year")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { shipments: data ?? [] },
    };
  },
});
