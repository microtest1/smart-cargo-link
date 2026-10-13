/**
 * SINGLE SOURCE OF TRUTH for AEF Logistics sea freight CBM pricing.
 *
 * Official formula:  TOTAL = CBM × baseRate × exchangeRate
 * Current official values: 255 × 12.5 = GHS 3,187.50 per CBM
 *
 * The live values are stored in the `cbm_pricing_rates` table (versioned).
 * The constants below are only the offline fallback / seed values and must
 * always match the currently active database row.
 */

export type CbmPricing = {
  id?: string;
  baseRate: number;
  exchangeRate: number;
  effectiveRate: number;
  currency: string;
};

export const DEFAULT_CBM_PRICING: CbmPricing = {
  baseRate: 255,
  exchangeRate: 12.5,
  effectiveRate: 3187.5,
  currency: "GHS",
};

/** Effective rate per CBM = base freight rate × exchange rate. */
export function effectiveCbmRate(
  baseRate: number = DEFAULT_CBM_PRICING.baseRate,
  exchangeRate: number = DEFAULT_CBM_PRICING.exchangeRate
): number {
  return Number(baseRate) * Number(exchangeRate);
}

/**
 * The one reusable calculation every part of the app must use.
 * CBM is never rounded; only the final monetary amount is rounded to 2dp.
 */
export function calculateFreightByCbm(
  cbm: number,
  baseRate: number = DEFAULT_CBM_PRICING.baseRate,
  exchangeRate: number = DEFAULT_CBM_PRICING.exchangeRate
): { effectiveRate: number; freightAmount: number } {
  const safeCbm = Number.isFinite(Number(cbm)) && Number(cbm) > 0 ? Number(cbm) : 0;
  const rate = effectiveCbmRate(baseRate, exchangeRate);
  return {
    effectiveRate: rate,
    freightAmount: Math.round(safeCbm * rate * 100) / 100,
  };
}

/** Convenience helper when only the pricing object is available. */
export function freightForCbm(cbm: number, pricing: CbmPricing = DEFAULT_CBM_PRICING): number {
  return calculateFreightByCbm(cbm, pricing.baseRate, pricing.exchangeRate).freightAmount;
}

/** GHS 3,187.50 — thousands separators, always two decimals. */
export function formatGhs(amount: number, currency = "GHS"): string {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${currency} ${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** CBM keeps precision — up to 6 decimals, at least 3 for readability. */
export function formatCbm(cbm: number, minDecimals = 3, maxDecimals = 6): string {
  const value = Number.isFinite(Number(cbm)) ? Number(cbm) : 0;
  return value.toLocaleString("en-GH", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatRatePerCbm(pricing: CbmPricing = DEFAULT_CBM_PRICING): string {
  return `${formatGhs(pricing.effectiveRate, pricing.currency)} / CBM`;
}
