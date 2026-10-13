import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ChinaWarehouse {
  id: string;
  user_id: string;
  user_code: string;
  company_id: string | null;
  warehouse_name: string;
  full_address: string;
  contact_person: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useChinaWarehouses() {
  const { user, profile } = useAuth();

  const { data: warehouses, isLoading, error, refetch } = useQuery({
    queryKey: ["china-warehouses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("china_warehouses")
        .select(`
          *,
          companies:company_id (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    warehouses: warehouses || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateChinaWarehouse() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouseData: Omit<ChinaWarehouse, "id" | "user_id" | "user_code" | "created_at" | "updated_at">) => {
      if (!user?.id || !profile?.unique_code) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("china_warehouses")
        .insert({
          ...warehouseData,
          user_id: user.id,
          user_code: profile.unique_code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["china-warehouses"] });
      toast({
        title: "Warehouse saved",
        description: "Your China warehouse has been saved successfully.",
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

export function useDeleteChinaWarehouse() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("china_warehouses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["china-warehouses"] });
      toast({
        title: "Warehouse deleted",
        description: "The warehouse has been removed.",
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
