import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export type FulfillmentType = "self_pickup" | "delivery" | "third_party_pickup";
export type FulfillmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface OrderFulfillment {
  id: string;
  invoice_id: string;
  container_id: string;
  user_id: string;
  user_code: string;
  fulfillment_type: FulfillmentType;
  third_party_name: string | null;
  third_party_phone: string | null;
  delivery_location_id: string | null;
  delivery_zone_id: string | null;
  delivery_address: string | null;
  contact_phone: string;
  status: FulfillmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFulfillmentData {
  invoice_id: string;
  container_id: string;
  fulfillment_type: FulfillmentType;
  contact_phone: string;
  third_party_name?: string;
  third_party_phone?: string;
  delivery_location_id?: string;
  delivery_zone_id?: string;
  delivery_address?: string;
  notes?: string;
}

export function useOrderFulfillments(containerId?: string) {
  const { user, isManager } = useAuth();

  const { data: fulfillments, isLoading, error, refetch } = useQuery({
    queryKey: ["order-fulfillments", containerId],
    queryFn: async () => {
      let query = supabase
        .from("order_fulfillments" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (containerId) {
        query = query.eq("container_id", containerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as OrderFulfillment[];
    },
    enabled: !!user?.id && (isManager || !!containerId),
  });

  return {
    fulfillments: fulfillments || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateOrderFulfillment() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFulfillmentData) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      // Validate required fields
      if (!data.fulfillment_type) {
        throw new Error("Fulfillment type is required");
      }
      if (!data.contact_phone) {
        throw new Error("Contact phone is required");
      }
      if (data.fulfillment_type === "delivery" && !data.delivery_zone_id && !data.delivery_address) {
        throw new Error("Delivery location or zone is required for delivery");
      }
      if (data.fulfillment_type === "third_party_pickup" && !data.third_party_name) {
        throw new Error("Third party name is required for third-party pickup");
      }

      const { data: fulfillment, error } = await supabase
        .from("order_fulfillments" as any)
        .insert({
          invoice_id: data.invoice_id,
          container_id: data.container_id,
          user_id: user.id,
          user_code: profile.unique_code,
          fulfillment_type: data.fulfillment_type,
          contact_phone: data.contact_phone,
          third_party_name: data.third_party_name || null,
          third_party_phone: data.third_party_phone || null,
          delivery_location_id: data.delivery_location_id || null,
          delivery_zone_id: data.delivery_zone_id || null,
          delivery_address: data.delivery_address || null,
          notes: data.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return fulfillment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-fulfillments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fulfillment Saved",
        description: "Your pickup/delivery preference has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOrderFulfillment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrderFulfillment> & { id: string }) => {
      const { data, error } = await supabase
        .from("order_fulfillments" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-fulfillments"] });
      toast({
        title: "Fulfillment Updated",
        description: "Fulfillment status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Admin statistics hook
export function useFulfillmentStats(containerId?: string, startDate?: string, endDate?: string) {
  const { user, isManager } = useAuth();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["fulfillment-stats", containerId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("order_fulfillments" as any)
        .select("*");

      if (containerId) {
        query = query.eq("container_id", containerId);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fulfillments = (data || []) as unknown as OrderFulfillment[];

      // Calculate statistics
      const selfPickupCount = fulfillments.filter(f => f.fulfillment_type === "self_pickup").length;
      const deliveryCount = fulfillments.filter(f => f.fulfillment_type === "delivery").length;
      const thirdPartyCount = fulfillments.filter(f => f.fulfillment_type === "third_party_pickup").length;
      const pendingCount = fulfillments.filter(f => f.status === "pending").length;
      const completedCount = fulfillments.filter(f => f.status === "completed").length;

      return {
        total: fulfillments.length,
        selfPickup: selfPickupCount,
        delivery: deliveryCount,
        thirdPartyPickup: thirdPartyCount,
        pending: pendingCount,
        completed: completedCount,
        byType: {
          self_pickup: selfPickupCount,
          delivery: deliveryCount,
          third_party_pickup: thirdPartyCount,
        },
      };
    },
    enabled: !!user?.id && isManager,
  });

  return {
    stats: stats || {
      total: 0,
      selfPickup: 0,
      delivery: 0,
      thirdPartyPickup: 0,
      pending: 0,
      completed: 0,
      byType: { self_pickup: 0, delivery: 0, third_party_pickup: 0 },
    },
    isLoading,
    refetch,
  };
}
