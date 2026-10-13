// Shared server-side CBM pricing service.
// Official formula: TOTAL = CBM x baseRate x exchangeRate (255 x 12.5 = GHS 3,187.50 / CBM)

export type CbmPricing = {
  id: string | null;
  baseRate: number;
  exchangeRate: number;
  effectiveRate: number;
  currency: string;
};

export const DEFAULT_CBM_PRICING: CbmPricing = {
  id: null,
  baseRate: 255,
  exchangeRate: 12.5,
  effectiveRate: 3187.5,
  currency: "GHS",
};

/** Reads the active versioned rate; falls back to the official constants. */
export async function getActiveCbmPricing(
  admin: { from: (t: string) => any },
  serviceType = "sea_freight",
): Promise<CbmPricing> {
  try {
    const { data } = await admin
      .from("cbm_pricing_rates")
      .select("id, base_rate, exchange_rate, effective_rate, currency")
      .eq("service_type", serviceType)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return DEFAULT_CBM_PRICING;
    return {
      id: data.id,
      baseRate: Number(data.base_rate),
      exchangeRate: Number(data.exchange_rate),
      effectiveRate: Number(data.effective_rate),
      currency: data.currency ?? "GHS",
    };
  } catch {
    return DEFAULT_CBM_PRICING;
  }
}

/** The one calculation. CBM keeps full precision; money rounds to 2dp. */
export function calculateFreightByCbm(cbm: number, pricing: CbmPricing) {
  const safeCbm = Number.isFinite(Number(cbm)) && Number(cbm) > 0 ? Number(cbm) : 0;
  const effectiveRate = pricing.baseRate * pricing.exchangeRate;
  return {
    cbm: safeCbm,
    effectiveRate,
    freightAmount: Math.round(safeCbm * effectiveRate * 100) / 100,
  };
}

export function formatGhs(amount: number, currency = "GHS"): string {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${currency} ${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
