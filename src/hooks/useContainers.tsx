import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Container {
  id: string;
  container_number: string;
  departure_date: string | null;
  estimated_arrival: string | null;
  capacity: number;
  current_load: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shipping_container_number: string | null;
  seal_number: string | null;
  container_type: string | null;
  origin: string | null;
  destination: string | null;
  loading_date: string | null;
}

export function useContainers() {
  const queryClient = useQueryClient();

  const { data: containers, isLoading, error, refetch } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Container[];
    },
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('containers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'containers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["containers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    containers: containers || [],
    isLoading,
    error,
    refetch,
  };
}

// Hook for customers: only returns containers where they have items assigned to their user_code
export function useMyContainers() {
  const { profile } = useAuth();
  const userCode = profile?.unique_code;
  const queryClient = useQueryClient();

  const { data: containers, isLoading, error, refetch } = useQuery({
    queryKey: ["my-containers", userCode],
    queryFn: async () => {
      // Simply query all containers - the RLS policy (user_has_container_access function)
      // handles filtering server-side via shipments, container_items, warehouse_submissions,
      // packing_list_items (by code and phone number match)
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Container[];
    },
    enabled: !!userCode,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('my-containers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'containers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-containers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    containers: containers || [],
    isLoading,
    error,
    refetch,
  };
}

export function useContainerById(id: string) {
  const { data: container, isLoading, error } = useQuery({
    queryKey: ["container", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Container | null;
    },
    enabled: !!id,
  });

  return { container, isLoading, error };
}

export function useCreateContainer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (containerData: Partial<Omit<Container, "id" | "created_at" | "updated_at">>) => {
      // If container_number is empty, let the DB trigger auto-generate it
      const insertData = { ...containerData };
      if (!insertData.container_number || insertData.container_number.trim() === '') {
        delete insertData.container_number;
      }
      const { data, error } = await supabase
        .from("containers")
        .insert([insertData as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      toast({
        title: "Container created",
        description: "The container has been created successfully.",
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

export function useUpdateContainer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<Container, "id">>) => {
      const { data, error } = await supabase
        .from("containers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      toast({
        title: "Container updated",
        description: "The container has been updated successfully.",
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
