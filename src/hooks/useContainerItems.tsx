import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ContainerItem {
  id: string;
  container_id: string;
  item_name: string;
  item_name_chinese: string | null;
  quantity: number;
  carton_count: number;
  unit_weight: number;
  total_weight: number;
  total_cbm: number;
  unit_price: number;
  available_quantity: number;
  notes: string | null;
  user_code: string | null; // Links item to specific customer
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  zone_name: string;
  zone_type: "region" | "country";
  country: string;
  base_fee: number;
  per_cbm_fee: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomerGoodsSelection {
  id: string;
  user_id: string;
  user_code: string;
  container_item_id: string;
  quantity_selected: number;
  cbm_calculated: number;
  status: "pending" | "confirmed" | "invoiced" | "paid" | "delivered";
  shipment_id: string | null;
  invoice_id: string | null;
  delivery_region: string | null;
  delivery_country: string;
  delivery_fee: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  container_items?: ContainerItem;
}

export function useContainerItems(containerId?: string) {
  const { data: items, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["container-items", containerId],
    queryFn: async () => {
      // First try container_items
      const { data: ciData, error: ciError } = await supabase
        .from("container_items" as any)
        .select("*")
        .eq("container_id", containerId)
        .order("total_cbm", { ascending: false }) as any;
        
      if (ciError) throw ciError;
      
      // If container_items exist for this user, return them
      if (ciData && ciData.length > 0) {
        return ciData as ContainerItem[];
      }
      
      // Fallback: fetch from packing_list_items (RLS filters by phone/code match)
      const { data: plData, error: plError } = await supabase
        .from("packing_lists" as any)
        .select("id")
        .eq("container_id", containerId) as any;
      
      if (plError || !plData || plData.length === 0) {
        return [] as ContainerItem[];
      }
      
      const plIds = plData.map((pl: any) => pl.id);
      const { data: pliData, error: pliError } = await supabase
        .from("packing_list_items" as any)
        .select("*")
        .in("packing_list_id", plIds)
        .order("cbm", { ascending: false }) as any;
      
      if (pliError) throw pliError;
      
      // Map packing_list_items to ContainerItem shape
      return (pliData || []).map((pli: any) => ({
        id: pli.id,
        container_id: containerId!,
        item_name: pli.product_name,
        item_name_chinese: null,
        quantity: pli.quantity || 1,
        carton_count: 1,
        unit_weight: pli.weight_kg || 0,
        total_weight: pli.weight_kg || 0,
        total_cbm: Number(pli.cbm) || 0,
        unit_price: 0,
        available_quantity: pli.quantity || 1,
        notes: null,
        user_code: pli.customer_code || null,
        created_at: pli.created_at,
        updated_at: pli.created_at,
      })) as ContainerItem[];
    },
    enabled: !!containerId,
  });

  const loading = isLoading || isFetching;

  return { items: items || [], isLoading: loading, error, refetch };
}

export function useDeliveryZones() {
  const { data: zones, isLoading, error } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones" as any)
        .select("*")
        .eq("is_active", true)
        .order("zone_type")
        .order("zone_name") as any;

      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const ghanaRegions = zones?.filter((z) => z.zone_type === "region") || [];
  const westAfricanCountries = zones?.filter((z) => z.zone_type === "country") || [];

  return { zones: zones || [], ghanaRegions, westAfricanCountries, isLoading, error };
}

export function useCustomerSelections() {
  const { data: selections, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-selections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_goods_selections" as any)
        .select(`
          *,
          container_items (*)
        `)
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      return data as CustomerGoodsSelection[];
    },
  });

  return { selections: selections || [], isLoading, error, refetch };
}

export function useCreateGoodsSelection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      container_item_id: string;
      quantity_selected: number;
      cbm_calculated: number;
      delivery_region?: string;
      delivery_country?: string;
      delivery_fee?: number;
      notes?: string;
      user_id: string;
      user_code: string;
    }) => {
      const { data: result, error } = await supabase
        .from("customer_goods_selections" as any)
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-selections"] });
      queryClient.invalidateQueries({ queryKey: ["container-items"] });
      toast({
        title: "Selection Added",
        description: "Your goods selection has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateGoodsSelection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomerGoodsSelection>) => {
      const { data, error } = await supabase
        .from("customer_goods_selections" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-selections"] });
      toast({
        title: "Selection Updated",
        description: "Your selection has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Calculate CBM per unit from an item
export function calculateCbmPerUnit(item: ContainerItem): number {
  if (item.quantity <= 0) return 0;
  return item.total_cbm / item.quantity;
}

// Calculate delivery fee based on CBM and zone
export function calculateDeliveryFee(zone: DeliveryZone, cbm: number): number {
  return zone.base_fee + zone.per_cbm_fee * cbm;
}
