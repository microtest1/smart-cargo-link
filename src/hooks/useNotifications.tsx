import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", profile?.unique_code, user?.id],
    queryFn: async () => {
      if (!profile?.unique_code && !user?.id) return [];
      
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by user_code or user_id
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

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.unique_code && !user?.id) return;

      let query = supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);

      if (profile?.unique_code) {
        query = query.eq("user_code", profile.unique_code);
      } else if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
