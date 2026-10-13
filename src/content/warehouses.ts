/**
 * Single source of truth for all Amoliga Elite China warehouse addresses.
 *
 * IMPORTANT: addresses, phone numbers, codes and Chinese characters below are
 * exact as supplied by operations. Do not "correct" or reformat them.
 */

export type WarehouseCategory = "sea" | "repacking" | "air" | "vehicle";

export interface WarehouseEntry {
  id: string;
  name: string;
  category: WarehouseCategory;
  typeLabel: string;
  bestFor: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  shippingMarkFields: string[];
  services?: string[];
  acceptedGoods?: string[];
  notes?: string;
}

export const OFFICIAL_SEA_VEHICLE_WAREHOUSE_ADDRESS =
  "AEF佛山市南海区里水镇科冠路3号6号楼101仓立特仓，入仓号立特16624728819";

export const WAREHOUSES: WarehouseEntry[] = [
  {
    id: "sea",
    name: "Sea Freight Warehouse — China",
    category: "sea",
    typeLabel: "Sea Freight",
    bestFor: "General, medical, special and consolidated sea-freight goods",
    address: OFFICIAL_SEA_VEHICLE_WAREHOUSE_ADDRESS,
    shippingMarkFields: ["Shipping Mark / AEF Code", "Name", "Number", "GH / Location"],
    services: ["Sea Freight", "General Goods", "Medical Goods", "Special Goods"],
    notes: "Use your existing AEF Code as the Shipping Mark on every package.",
  },
  {
    id: "vehicle",
    name: "Car & Vehicle Warehouse — China",
    category: "vehicle",
    typeLabel: "Cars & Vehicles",
    bestFor: "Cars, buses, tractors, motorbikes, tricycles and trucks",
    address: OFFICIAL_SEA_VEHICLE_WAREHOUSE_ADDRESS,
    acceptedGoods: [
      "Cars & Vehicles",
      "Buses",
      "Tractors",
      "Motorbikes",
      "Tricycles",
      "Trucks & Other Vehicles",
    ],
    shippingMarkFields: [
      "Shipping Mark / AEF Code",
      "Name",
      "Number",
      "GH / Location",
      "Chassis / VIN / Serial Number",
      "Model",
      "Year",
    ],
    notes: "Vehicle shipments must include the chassis/VIN/serial number, model and year.",
  },
  {
    id: "repacking",
    name: "Repacking & Consolidation Warehouse — China",
    category: "repacking",
    typeLabel: "Repacking",
    bestFor: "Repacking, consolidation, packaging and quality checks",
    address: "中山市坦洲镇锦绣国际花城二期2栋1108房",
    contactPerson: "SAM",
    phone: "13528173391",
    shippingMarkFields: ["Shipping Mark / AEF Code", "Name", "Number", "GH / Location"],
    services: ["Repacking", "Consolidation", "Packaging", "Quality Check"],
  },
  {
    id: "air",
    name: "Air Shipping Warehouse — China",
    category: "air",
    typeLabel: "Air Freight",
    bestFor: "Air freight shipments to Ghana",
    address: "中山市坦洲镇锦绣国际花城二期2栋1108房",
    contactPerson: "SAM",
    phone: "13528173391",
    shippingMarkFields: ["Shipping Mark / AEF Code", "Name", "Number", "GH / Location"],
    services: ["Air Freight"],
  },
];

export const WAREHOUSE_GUIDE: { need: string; warehouse: string }[] = [
  { need: "General / Medical / Special Goods", warehouse: "Sea Freight Warehouse" },
  { need: "Vehicles / Motorbikes / Trucks", warehouse: "Car & Vehicle Warehouse" },
  { need: "Repacking / Consolidation", warehouse: "Repacking Warehouse" },
  { need: "Air Freight", warehouse: "Air Shipping Warehouse" },
];

export const SHIPPING_MARK_PLACEHOLDER = "Your AEF Code";
export const CUSTOMER_NAME_PLACEHOLDER = "Your Name";
export const CUSTOMER_PHONE_PLACEHOLDER = "Your Phone Number";
export const GHANA_LOCATION_PLACEHOLDER = "Your Destination in Ghana";