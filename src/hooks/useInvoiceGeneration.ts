import { supabase } from "@/integrations/supabase/client";

type SelectionItem = {
  item: {
    id: string;
    item_name: string;
    total_weight?: number | null;
    carton_count?: number | null;
    total_cbm: number;
    quantity?: number;
    available_quantity?: number;
  };
  quantity: number;
  cbm: number;
};

export type InvoiceGenerationInput = {
  userId: string;
  profile: { full_name: string; email: string | null; unique_code: string | null };
  containerId: string;
  containerName: string;
  items: SelectionItem[];
  totalCbm: number;
};

export type InvoiceGenerationResult = {
  invoiceId: string;
  invoiceNumber: string;
  shipmentId: string;
  trackingNumber: string;
  totalWeight: number;
  totalCartons: number;
  goodsCost: number;
  totalAmount: number;
};

/**
 * Delegates invoice creation to the `create-invoice` edge function.
 * The server recomputes CBM/amount from database values — the client
 * cannot influence the invoice total.
 */
export async function generateInvoiceFromSelection(
  input: InvoiceGenerationInput
): Promise<InvoiceGenerationResult> {
  if (!input.userId) throw new Error("User not authenticated");
  if (!input.containerId) throw new Error("Container ID is required");
  if (!input.items?.length) throw new Error("Please select at least one item");

  const payload = {
    containerId: input.containerId,
    containerName: input.containerName,
    items: input.items
      .filter((si) => si?.item?.id)
      .map((si) => ({ id: si.item.id, quantity: si.quantity })),
  };

  const { data, error } = await supabase.functions.invoke("create-invoice", { body: payload });
  if (error) throw error;
  if (!data || (data as any).error) throw new Error((data as any)?.error ?? "Failed to generate invoice");

  return data as InvoiceGenerationResult;
}
