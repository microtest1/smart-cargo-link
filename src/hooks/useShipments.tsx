import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export function useShipments() {
  const { profile, user } = useAuth();

  const { data: shipments, isLoading, error, refetch } = useQuery({
    queryKey: ["shipments", profile?.unique_code, user?.id],
    queryFn: async () => {
      if (!profile?.unique_code && !user?.id) return [];
      
      // Fetch shipments by user_code or user_id
      let query = supabase
        .from("shipments")
        .select(`
          *,
          companies:company_id (
            name,
            phone,
            whatsapp
          )
        `)
        .order("created_at", { ascending: false });

      // Filter by user_code if available, otherwise by user_id
      if (profile?.unique_code) {
        query = query.eq("user_code", profile.unique_code);
      } else if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!(profile?.unique_code || user?.id),
  });

  return {
    shipments: shipments || [],
    isLoading,
    error,
    refetch,
  };
}

export function useShipmentById(id: string) {
  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          *,
          companies:company_id (
            name,
            phone,
            whatsapp,
            email
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return { shipment, isLoading, error };
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Delete dependent records first (foreign key constraints)
      await supabase.from("customer_goods_selections").delete().eq("shipment_id", shipmentId);
      
      // Delete invoices and their dependencies
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("shipment_id", shipmentId);

      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((i) => i.id);
        await supabase.from("order_fulfillments").delete().in("invoice_id", invoiceIds);
        await supabase.from("payment_confirmations").delete().in("invoice_id", invoiceIds);
        await supabase.from("invoices").delete().eq("shipment_id", shipmentId);
      }

      // Delete delivery requests linked to this shipment
      await supabase.from("delivery_requests").delete().eq("shipment_id", shipmentId);

      // Delete the shipment
      const { error } = await supabase
        .from("shipments")
        .delete()
        .eq("id", shipmentId);

      if (error) throw error;

      // Log the deletion
      try {
        await supabase.rpc("log_audit_event", {
          p_action: "delete",
          p_entity_type: "shipment",
          p_entity_id: shipmentId,
          p_details: { deleted_by: user.id } as any,
        });
      } catch (e) {
        console.error("Audit log failed:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-requests"] });
      toast({ title: "Shipment deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete shipment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
