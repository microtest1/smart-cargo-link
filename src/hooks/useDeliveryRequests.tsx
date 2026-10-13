import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DeliveryRequest {
  id: string;
  user_id: string;
  user_code: string;
  shipment_id: string | null;
  delivery_location_id: string | null;
  amount: number | null;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeliveryRequests() {
  const { user } = useAuth();

  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ["delivery-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`
          *,
          shipments:shipment_id (tracking_number, product, status),
          delivery_locations:delivery_location_id (address, latitude, longitude)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    requests: requests || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateDeliveryRequest() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestData: Omit<DeliveryRequest, "id" | "user_id" | "user_code" | "created_at" | "updated_at">) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("delivery_requests")
        .insert({
          ...requestData,
          user_id: user.id,
          user_code: profile.unique_code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-requests"] });
      toast({
        title: "Delivery requested",
        description: "Your delivery request has been submitted.",
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

export function useUpdateDeliveryRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-requests"] });
      toast({
        title: "Request updated",
        description: "Your delivery request has been updated.",
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

export function useDeleteDeliveryRequest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("delivery_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      try {
        await supabase.rpc("log_audit_event" as any, {
          p_action: "delete",
          p_entity_type: "delivery_request",
          p_entity_id: requestId,
          p_details: { deleted_by: user.id } as any,
        });
      } catch (e) {
        console.error("Audit log error:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-requests"] });
      toast({
        title: "Record successfully deleted",
        description: "The delivery request has been removed.",
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
