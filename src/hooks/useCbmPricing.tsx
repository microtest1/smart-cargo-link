import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CbmPricing, DEFAULT_CBM_PRICING } from "@/lib/pricing";

export type PricingRateRow = {
  id: string;
  service_type: string;
  base_rate: number;
  exchange_rate: number;
  effective_rate: number;
  currency: string;
  is_active: boolean;
  effective_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

/** Live active CBM rate. Falls back to the official constants when offline. */
export function useCbmPricing(serviceType = "sea_freight") {
  const query = useQuery({
    queryKey: ["cbm-pricing", serviceType],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CbmPricing> => {
      const { data, error } = await supabase
        .from("cbm_pricing_rates")
        .select("id, base_rate, exchange_rate, effective_rate, currency")
        .eq("service_type", serviceType)
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return DEFAULT_CBM_PRICING;
      return {
        id: data.id,
        baseRate: Number(data.base_rate),
        exchangeRate: Number(data.exchange_rate),
        effectiveRate: Number(data.effective_rate),
        currency: data.currency ?? "GHS",
      };
    },
  });

  return { pricing: query.data ?? DEFAULT_CBM_PRICING, isLoading: query.isLoading };
}

export function usePricingRateHistory(serviceType = "sea_freight") {
  return useQuery({
    queryKey: ["cbm-pricing-history", serviceType],
    queryFn: async (): Promise<PricingRateRow[]> => {
      const { data, error } = await supabase
        .from("cbm_pricing_rates")
        .select("*")
        .eq("service_type", serviceType)
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PricingRateRow[];
    },
  });
}

export function useCreatePricingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      serviceType?: string;
      baseRate: number;
      exchangeRate: number;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("cbm_pricing_rates")
        .insert({
          service_type: input.serviceType ?? "sea_freight",
          base_rate: input.baseRate,
          exchange_rate: input.exchangeRate,
          // recomputed server-side by trigger; sent to satisfy NOT NULL
          effective_rate: input.baseRate * input.exchangeRate,
          currency: "GHS",
          is_active: true,
          notes: input.notes ?? null,
          created_by: userData?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PricingRateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cbm-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["cbm-pricing-history"] });
    },
  });
}
