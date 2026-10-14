// Builds channel-specific China warehouse messages from the LATEST saved record.
// Never reuse a previously stored message body when resending.
export const PORTAL_BASE_URL = "https://smart-cargo-link.lovable.app";

export interface WarehouseGoodsRecord {
  id: string;
  full_name: string;
  customer_user_code?: string | null;
  tracking_number?: string | null;
  warehouse_invoice_number?: string | null;
  product_description?: string | null;
  cbm?: number | null;
  weight_kg?: number | null;
  photo_count?: number;
}

export type Channel = "sms" | "whatsapp" | "email";

/** Customer-portal link. Opening it requires sign-in and an ownership check; it never contains a storage URL. */
export function photoPortalLink(recordId: string) {
  return `${PORTAL_BASE_URL}/goods-photos/${encodeURIComponent(recordId)}`;
}

function details(r: WarehouseGoodsRecord) {
  const d: string[] = [];
  if (r.product_description) d.push(`Item: ${r.product_description}`);
  if (r.tracking_number) d.push(`Tracking: ${r.tracking_number}`);
  if (r.warehouse_invoice_number) d.push(`Warehouse invoice: ${r.warehouse_invoice_number}`);
  if (r.cbm != null) d.push(`CBM: ${r.cbm}`);
  if (r.weight_kg != null) d.push(`Weight: ${r.weight_kg}kg`);
  return d;
}

export function buildWarehouseMessage(channel: Channel, r: WarehouseGoodsRecord): string {
  const name = r.full_name?.trim() || "Valued Customer";
  const d = details(r);
  const code = r.customer_user_code ? ` (${r.customer_user_code})` : "";
  const intro = `Hello ${name}${code}, your goods have been received and recorded at our China warehouse.`;
  const photos = r.photo_count ? r.photo_count : 0;

  if (channel === "sms") {
    const lines = ["AMOLIGA ELITE FREIGHT & LOGISTICS", intro];
    if (d.length) lines.push(d.join(" | "));
    if (photos) lines.push(`View your goods photos (sign in required): ${photoPortalLink(r.id)}`);
    lines.push("Thank you for shipping with Amoliga Elite.");
    return lines.join("\n");
  }
  if (channel === "whatsapp") {
    const lines = ["*Amoliga Elite Freight & Logistics*", "", intro];
    if (d.length) lines.push("", ...d.map((x) => `• ${x}`));
    if (photos) lines.push("", `📷 ${photos} photo(s) of your goods are attached.`);
    lines.push("", "Thank you for shipping with Amoliga Elite.");
    return lines.join("\n");
  }
  const lines = [intro, ""];
  if (d.length) lines.push(...d, "");
  if (photos) lines.push(`${photos} photo(s) of your goods are attached to this email.`, "");
  lines.push("Thank you for shipping with Amoliga Elite Freight & Logistics.");
  return lines.join("\n");
}
