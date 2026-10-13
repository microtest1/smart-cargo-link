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
  name: "track_shipment",
  title: "Track a shipment",
  description:
    "Look up a shipment by tracking number for the signed-in user. Returns status, container, route, and estimated arrival.",
  inputSchema: {
    tracking_number: z
      .string()
      .trim()
      .min(1)
      .describe("The tracking number (e.g. AEF_XXXXX or courier tracking id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tracking_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("shipments")
      .select(
        "id, tracking_number, status, product, origin, destination, estimated_delivery, service_type, vehicle_identifier, vehicle_model, vehicle_year, containers:container_id (container_number, status, estimated_arrival)",
      )
      .eq("tracking_number", tracking_number)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `No shipment found for tracking number "${tracking_number}" on your account.`,
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { shipment: data },
    };
  },
});
