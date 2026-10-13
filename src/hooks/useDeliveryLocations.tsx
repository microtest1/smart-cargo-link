import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DeliveryLocation {
  id: string;
  user_id: string;
  user_code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeliveryLocations() {
  const { user } = useAuth();

  const { data: locations, isLoading, error, refetch } = useQuery({
    queryKey: ["delivery-locations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DeliveryLocation[];
    },
    enabled: !!user?.id,
  });

  return {
    locations: locations || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateDeliveryLocation() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData: Omit<DeliveryLocation, "id" | "user_id" | "user_code" | "created_at" | "updated_at">) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("delivery_locations")
        .insert({
          ...locationData,
          user_id: user.id,
          user_code: profile.unique_code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-locations"] });
      toast({
        title: "Location saved",
        description: "Your Ghana delivery location has been saved.",
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

export function useUpdateDeliveryLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-locations"] });
      toast({
        title: "Location updated",
        description: "Your delivery location has been updated.",
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

export function useDeleteDeliveryLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-locations"] });
      toast({
        title: "Location deleted",
        description: "The location has been removed.",
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
