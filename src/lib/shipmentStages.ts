import { Package, Warehouse, Ship, Landmark, ClipboardCheck } from "lucide-react";

export type ShipmentStageKey =
  | "received_china"
  | "processing"
  | "in_transit"
  | "arrived_ghana"
  | "ready_collection";

export interface ShipmentStage {
  key: ShipmentStageKey;
  label: string;
  emoji: string;
  description: string;
  notificationTitle: string;
  notificationMessage: string;
  icon: typeof Package;
  color: string;
}

export const SHIPMENT_STAGES: ShipmentStage[] = [
  {
    key: "received_china",
    label: "Goods Received in China",
    emoji: "✅",
    description: "Received at China warehouse",
    notificationTitle: "✅ Goods Received in China",
    notificationMessage: "Your goods have been received at our China warehouse.",
    icon: Warehouse,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "processing",
    label: "Shipment Processing",
    emoji: "📦",
    description: "Being packed and prepared",
    notificationTitle: "📦 Shipment Processing",
    notificationMessage: "Your shipment is currently being processed.",
    icon: Package,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    key: "in_transit",
    label: "Goods in Transit",
    emoji: "🚢",
    description: "En route from China to Ghana",
    notificationTitle: "🚢 Goods in Transit",
    notificationMessage: "Your shipment has left China and is currently in transit.",
    icon: Ship,
    color: "bg-cargo-blue/10 text-cargo-blue",
  },
  {
    key: "arrived_ghana",
    label: "Arrived in Ghana / Customs Clearance",
    emoji: "🇬🇭",
    description: "Undergoing customs clearance",
    notificationTitle: "🇬🇭 Arrived in Ghana / Customs Clearance",
    notificationMessage:
      "Your shipment has arrived in Ghana and is undergoing customs clearance.",
    icon: Landmark,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "ready_collection",
    label: "Ready for Collection",
    emoji: "📋",
    description: "Ready for pickup or delivery",
    notificationTitle: "📋 Ready for Collection",
    notificationMessage:
      "Your shipment is now ready for collection. Please contact us or arrange delivery.",
    icon: ClipboardCheck,
    color: "bg-success/10 text-success",
  },
];

/**
 * Map any legacy or current status string into one of the 5 canonical stages.
 * Unknown values default to `received_china`.
 */
export function mapToStage(status: string | null | undefined): ShipmentStageKey {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "received_china":
    case "received":
    case "pending":
    case "in_warehouse":
    case "packed":
      return "received_china";
    case "processing":
      return "processing";
    case "in_transit":
    case "in-transit":
    case "shipped":
    case "left_china":
      return "in_transit";
    case "arrived_ghana":
    case "arrived":
    case "customs":
      return "arrived_ghana";
    case "ready_collection":
    case "ready_for_pickup":
    case "ready":
    case "delivered":
      return "ready_collection";
    default:
      return "received_china";
  }
}

export function getStageIndex(status: string | null | undefined): number {
  const key = mapToStage(status);
  return SHIPMENT_STAGES.findIndex((s) => s.key === key);
}

export function getStage(status: string | null | undefined): ShipmentStage {
  const key = mapToStage(status);
  return SHIPMENT_STAGES.find((s) => s.key === key) || SHIPMENT_STAGES[0];
}

/**
 * Build timeline steps for a given current status.
 */
export function buildTimelineSteps(currentStatus: string | null | undefined) {
  const currentIdx = getStageIndex(currentStatus);
  return SHIPMENT_STAGES.map((stage, idx) => ({
    id: stage.key,
    label: `${stage.emoji} ${stage.label}`,
    description: stage.description,
    icon: stage.icon,
    completed: idx <= currentIdx,
    current: idx === currentIdx,
  }));
}
