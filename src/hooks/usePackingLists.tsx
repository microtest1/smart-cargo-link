import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PackingList {
  id: string;
  container_id: string | null;
  container_name: string | null;
  upload_date: string;
  total_entries: number;
  total_cbm: number;
  total_weight: number;
  status: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  source_filename: string | null;
  fingerprint: string | null;
  total_cartons: number;
  customer_groups: number;
  matched_groups: number;
  unmatched_groups: number;
  review_rows: number;
  containers?: { container_number: string; shipping_container_number: string | null } | null;
}

export interface SmsBatch {
  id: string;
  packing_list_id: string;
  customer_code: string | null;
  customer_phone: string;
  customer_name: string | null;
  product_summary: string;
  total_quantity: number;
  total_cbm: number;
  total_weight: number;
  sms_sent: boolean;
  sms_sent_at: string | null;
  sms_error: string | null;
  sms_message_id: string | null;
  created_at: string;
  normalized_phone: string | null;
  sms_status: string;
  attempt_count: number;
  last_attempt_at: string | null;
}

export function usePackingLists() {
  const { data: packingLists, isLoading, error, refetch } = useQuery({
    queryKey: ["packing-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_lists")
        .select(`
          *,
          containers:container_id (container_number, shipping_container_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PackingList[];
    },
  });

  return {
    packingLists: packingLists || [],
    isLoading,
    error,
    refetch,
  };
}

export function useSmsBatches(packingListId?: string) {
  const { data: batches, isLoading, error, refetch } = useQuery({
    queryKey: ["sms-batches", packingListId],
    queryFn: async () => {
      let query = supabase
        .from("sms_batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (packingListId) {
        query = query.eq("packing_list_id", packingListId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SmsBatch[];
    },
    enabled: !!packingListId || packingListId === undefined,
  });

  return {
    batches: batches || [],
    isLoading,
    error,
    refetch,
  };
}

export function useRetrySmsBlatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // Get the batch details
      const { data: batch, error: fetchError } = await supabase
        .from("sms_batches")
        .select("*")
        .eq("id", batchId)
        .single();

      if (fetchError) throw fetchError;
      if (!batch.customer_phone) {
        throw new Error("No phone number available");
      }

      if (!batch.customer_code) {
        throw new Error("Missing tracking/customer code from uploaded sheet");
      }

      const customerName = batch.customer_name || "Valued Customer";
      const trackingCodeFromSheet = batch.customer_code;

      const smsMessage = `Hello ${customerName}, your goods have been received and packed at our China warehouse.\n\nYou can track your shipment using this code:\n\n${trackingCodeFromSheet}\n\nVisit https://amoligaelitefreight.com\n\nCreate an account or enter your code to:\n• Track your goods\n• View shipment updates\n• Request delivery when available\n\nAmoliga Elite Freight & Logistics\n\nPowered by Asesawa Cauchere.`;

      // Send SMS via edge function
      const { data, error } = await supabase.functions.invoke("send-sms-notification", {
        body: {
          to: batch.customer_phone,
          message: smsMessage,
          type: "delivery_requested",
        },
      });

      if (error) throw error;

      // Update batch status
      await supabase
        .from("sms_batches")
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
          sms_error: null,
          sms_message_id: data.messageId,
        })
        .eq("id", batchId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-batches"] });
      toast({ title: "SMS sent successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAdminSettings() {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  return {
    settings: settings || [],
    isLoading,
    refetch,
  };
}

export function useUpdateAdminSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
