import { auth, defineMcp } from "@lovable.dev/mcp-js";
import trackShipment from "./tools/track-shipment";
import listShipments from "./tools/list-shipments";
import listContainers from "./tools/list-containers";
import getProfile from "./tools/get-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "amoliga-elite-mcp",
  title: "Amoliga Elite Logistics",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Amoliga Elite Freight & Logistics customer. Use `track_shipment` to look up one shipment by tracking number, `list_shipments` to browse the user's shipments, `list_containers` to see containers, and `get_my_profile` to fetch the caller's profile.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [trackShipment, listShipments, listContainers, getProfile],
});
