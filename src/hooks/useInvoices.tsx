import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  user_code: string;
  shipment_id: string;
  container_id: string | null; // CRITICAL: Every invoice must be bound to ONE specific container
  amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  status: "pending" | "paid" | "partially_paid" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  shipments?: {
    tracking_number: string;
    product: string;
    status: string;
    weight: number | null;
    origin: string;
    destination: string;
    container_id?: string | null;
    companies?: {
      name: string;
    };
  };
  containers?: {
    id: string;
    container_number: string;
    status: string;
  };
}

export interface PaymentConfirmation {
  id: string;
  invoice_id: string;
  user_id: string;
  user_code: string;
  transaction_id: string;
  payment_method: "mobile_money" | "bank_transfer" | "cash";
  amount: number;
  status: "pending" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  container_id: string | null; // Payments must reference Container ID
  created_at: string;
  updated_at: string;
}

export function useInvoices() {
  const { user } = useAuth();

  const { data: invoices, isLoading, error, refetch } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select(`
          *,
          shipments:shipment_id (
            tracking_number,
            product,
            status,
            weight,
            origin,
            destination,
            container_id,
            companies:company_id (name)
          ),
          containers:container_id (
            id,
            container_number,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Invoice[];
    },
    enabled: !!user?.id,
  });

  return {
    invoices: invoices || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateInvoice() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      shipment_id: string;
      amount: number;
      tax_amount?: number;
      notes?: string;
    }) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      // Generate invoice number
      const { data: invoiceNumber, error: fnError } = await supabase.rpc("generate_invoice_number" as any);
      if (fnError) throw fnError;

      const totalAmount = data.amount + (data.tax_amount || 0);

      const { data: invoice, error } = await supabase
        .from("invoices" as any)
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          user_code: profile.unique_code,
          shipment_id: data.shipment_id,
          amount: data.amount,
          tax_amount: data.tax_amount || 0,
          total_amount: totalAmount,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Invoice Created",
        description: "Your invoice has been generated successfully.",
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

export function usePaymentConfirmations(invoiceId?: string) {
  const { user } = useAuth();

  const { data: confirmations, isLoading, error, refetch } = useQuery({
    queryKey: ["payment-confirmations", invoiceId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("payment_confirmations" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (invoiceId) {
        query = query.eq("invoice_id", invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as PaymentConfirmation[];
    },
    enabled: !!user?.id,
  });

  return {
    confirmations: confirmations || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreatePaymentConfirmation() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      invoice_id: string;
      transaction_id: string;
      payment_method: "mobile_money" | "bank_transfer" | "cash";
      amount: number;
      notes?: string;
      container_id?: string; // CRITICAL: Payments must reference Container ID
    }) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      const { data: confirmation, error } = await supabase
        .from("payment_confirmations" as any)
        .insert({
          invoice_id: data.invoice_id,
          user_id: user.id,
          user_code: profile.unique_code,
          transaction_id: data.transaction_id,
          payment_method: data.payment_method,
          amount: data.amount,
          notes: data.notes,
          container_id: data.container_id || null, // CRITICAL: Bind payment to container
        })
        .select()
        .single();

      if (error) throw error;
      return confirmation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Payment Submitted",
        description: "Your payment confirmation has been submitted for verification.",
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

export function useDeleteInvoice() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Delete dependent records first (foreign key constraints)
      await supabase.from("customer_goods_selections" as any).delete().eq("invoice_id", invoiceId);
      await supabase.from("order_fulfillments" as any).delete().eq("invoice_id", invoiceId);
      await supabase.from("payment_confirmations" as any).delete().eq("invoice_id", invoiceId);

      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      // Log audit event
      try {
        await supabase.rpc("log_audit_event" as any, {
          p_action: "delete",
          p_entity_type: "invoice",
          p_entity_id: invoiceId,
          p_details: { deleted_by: user.id } as unknown as Json,
        });
      } catch (e) {
        console.error("Audit log error:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Record successfully deleted",
        description: "The invoice has been removed.",
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

export function useDeleteInvoices() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Delete dependent records first (foreign key constraints)
      await supabase.from("customer_goods_selections" as any).delete().in("invoice_id", invoiceIds);
      await supabase.from("order_fulfillments" as any).delete().in("invoice_id", invoiceIds);
      await supabase.from("payment_confirmations" as any).delete().in("invoice_id", invoiceIds);

      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .in("id", invoiceIds);

      if (error) throw error;

      try {
        await supabase.rpc("log_audit_event" as any, {
          p_action: "bulk_delete",
          p_entity_type: "invoice",
          p_entity_id: invoiceIds.join(","),
          p_details: { count: invoiceIds.length, deleted_by: user.id } as unknown as Json,
        });
      } catch (e) {
        console.error("Audit log error:", e);
      }
    },
    onSuccess: (_, invoiceIds) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Record successfully deleted",
        description: `${invoiceIds.length} invoice(s) have been removed.`,
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
