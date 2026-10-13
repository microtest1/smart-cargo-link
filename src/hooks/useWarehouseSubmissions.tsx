import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WarehouseSubmission {
  id: string;
  container_id: string | null;
  tracking_number: string;
  product_name: string;
  product_details: string | null;
  quantity_received: number;
  fulfillment_date: string;
  customer_user_code: string | null;
  shipment_id: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  sms_error: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  containers?: { container_number: string } | null;
  profiles?: { full_name: string; phone: string | null } | null;
}

interface UseWarehouseSubmissionsOptions {
  containerId?: string;
  trackingNumber?: string;
  status?: string;
  userCode?: string;
}

interface WarehouseSubmissionWithContainer extends WarehouseSubmission {
  containers?: { container_number: string; status?: string; estimated_arrival?: string | null } | null;
}

export function useWarehouseSubmissions(options: UseWarehouseSubmissionsOptions = {}) {
  const { containerId, trackingNumber, status, userCode } = options;

  const { data: submissions, isLoading, error, refetch } = useQuery({
    queryKey: ["warehouse-submissions", containerId, trackingNumber, status, userCode],
    queryFn: async () => {
      let query = supabase
        .from("warehouse_submissions")
        .select(`
          *,
          containers:container_id (container_number)
        `)
        .order("created_at", { ascending: false });

      if (containerId) {
        query = query.eq("container_id", containerId);
      }
      if (trackingNumber) {
        query = query.ilike("tracking_number", `%${trackingNumber}%`);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (userCode) {
        query = query.eq("customer_user_code", userCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WarehouseSubmission[];
    },
  });

  return {
    submissions: submissions || [],
    isLoading,
    error,
    refetch,
  };
}

export function useWarehouseSubmissionByTracking(trackingNumber: string) {
  const { data: submission, isLoading, error } = useQuery({
    queryKey: ["warehouse-submission-tracking", trackingNumber],
    queryFn: async () => {
      if (!trackingNumber) return null;
      
      const { data, error } = await supabase
        .from("warehouse_submissions")
        .select(`
          *,
          containers:container_id (container_number, status, estimated_arrival)
        `)
        .eq("tracking_number", trackingNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as WarehouseSubmissionWithContainer | null;
    },
    enabled: !!trackingNumber,
  });

  return { submission, isLoading, error };
}

export function useCustomerWarehouseUpdates() {
  const { data: updates, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-warehouse-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_submissions")
        .select(`
          *,
          containers:container_id (container_number, status, estimated_arrival)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WarehouseSubmissionWithContainer[];
    },
  });

  return {
    updates: updates || [],
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("warehouse_submissions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-submissions"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useResendSMS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (submission: WarehouseSubmission) => {
      if (!submission.customer_user_code) {
        throw new Error("No customer user code associated with this submission");
      }

      // Get customer phone
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("unique_code", submission.customer_user_code)
        .maybeSingle();

      if (!profile?.phone) {
        throw new Error("Customer phone number not found");
      }

      const smsMessage = `Hello ${profile.full_name || "Valued Customer"}, your goods have been received and packed at our China warehouse.\n\nYou can track your shipment using this code:\n\n${submission.customer_user_code}\n\nVisit https://amoligaelitefreight.com\n\nCreate an account or enter your code to:\n• Track your goods\n• View shipment updates\n• Request delivery when available\n\nAmoliga Elite Freight & Logistics\n\nPowered by Asesawa Cauchere.`;

      const { data, error } = await supabase.functions.invoke("send-sms-notification", {
        body: {
          to: profile.phone,
          message: smsMessage,
          type: "delivery_requested",
        },
      });

      if (error) throw error;

      // Update submission SMS status
      await supabase
        .from("warehouse_submissions")
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
          sms_error: null,
        })
        .eq("id", submission.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-submissions"] });
      toast({ title: "SMS sent successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to send SMS", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
