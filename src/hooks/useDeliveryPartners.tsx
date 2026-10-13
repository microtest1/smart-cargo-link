import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryPartner {
  id: string;
  name: string;
  service_description: string | null;
  coverage: string | null;
  logo_url: string | null;
  is_active: boolean;
  // Contact details are admin-only and not returned to customers
  address?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  email?: string | null;
}

export function useDeliveryPartners() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ["delivery-partners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_active_delivery_partners_public"
      );
      if (error) throw error;
      return (data || []) as DeliveryPartner[];
    },
  });

  return { partners: partners || [], isLoading };
}
