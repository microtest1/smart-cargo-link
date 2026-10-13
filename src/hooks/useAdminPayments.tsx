import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PaymentConfirmationWithDetails {
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
  container_id: string | null; // CRITICAL: Payments must reference Container ID
  created_at: string;
  updated_at: string;
  invoices?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    amount_paid?: number | null;
    status: string;
    container_id?: string | null;

    shipments?: {
      tracking_number: string;
      product: string;
      container_id?: string | null;
      companies?: {
        name: string;
      };
    };
  };
  containers?: {
    id: string;
    container_number: string;
    status: string;
  };
  profiles?: {
    full_name: string;
    phone: string | null;
  };
}

export function useAdminPaymentConfirmations() {
  const { user, isManager } = useAuth();

  const { data: confirmations, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-payment-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select(`
          *,
          invoices:invoice_id (
            id,
            invoice_number,
            total_amount,
            amount_paid,
            status,
            container_id,

            shipments:shipment_id (
              tracking_number,
              product,
              container_id,
              companies:company_id (name)
            )
          ),
          containers:container_id (
            id,
            container_number,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userCodes = [...new Set((data || []).map((c: any) => c.user_code))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("unique_code, full_name, phone")
        .in("unique_code", userCodes);

      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.unique_code, p])
      );

      return (data || []).map((c: any) => ({
        ...c,
        profiles: profilesMap.get(c.user_code) || null,
      })) as PaymentConfirmationWithDetails[];
    },
    enabled: !!user?.id && isManager,
  });

  return {
    confirmations: confirmations || [],
    isLoading,
    error,
    refetch,
  };
}

export function useVerifyPayment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      confirmationId,
      invoiceId,
      action,
      notes,
    }: {
      confirmationId: string;
      invoiceId: string;
      action: "verify" | "reject";
      notes?: string;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Update payment confirmation status
      const { error: confirmError } = await supabase
        .from("payment_confirmations")
        .update({
          status: action === "verify" ? "verified" : "rejected",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", confirmationId);

      if (confirmError) throw confirmError;

      // If verified, settle the invoice: keep amount_paid in sync with status
      if (action === "verify") {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("id", invoiceId)
          .maybeSingle();

        const { error: invoiceError } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: Number(invoice?.total_amount ?? 0),
          })
          .eq("id", invoiceId);

        if (invoiceError) throw invoiceError;
      }


      return { action };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
      toast({
        title: data.action === "verify" ? "Payment Verified" : "Payment Rejected",
        description:
          data.action === "verify"
            ? "The payment has been verified and invoice marked as paid."
            : "The payment confirmation has been rejected.",
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
