import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Warehouse, CheckCircle, MapPin, Clock, Loader2, Package } from "lucide-react";
import { format } from "date-fns";

export default function AdminWarehouseConfirmation() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trackingRecords, isLoading } = useQuery({
    queryKey: ["admin-tracking-cache", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("shipment_tracking_cache")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (searchQuery.trim()) {
        query = query.ilike("tracking_number", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (trackingNumber: string) => {
      const { error } = await supabase
        .from("shipment_tracking_cache")
        .update({
          warehouse_confirmation: true,
          warehouse_confirmed_at: new Date().toISOString(),
          warehouse_status: "Received at Amoliga China Warehouse",
        })
        .eq("tracking_number", trackingNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-cache"] });
      toast({ title: "Warehouse receipt confirmed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error confirming receipt", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout title="Warehouse Confirmation">
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracking number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !trackingRecords?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tracked shipments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trackingRecords.map((record: any) => (
              <Card key={record.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{record.tracking_number}</span>
                        <Badge variant="secondary" className="text-xs">
                          {record.status}
                        </Badge>
                      </div>
                      {record.courier_name && (
                        <p className="text-sm text-muted-foreground">Courier: {record.courier_name}</p>
                      )}
                      {record.current_location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {record.current_location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Updated: {format(new Date(record.updated_at), "dd MMM yyyy HH:mm")}
                      </p>
                      {record.guangzhou_detected && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          <MapPin className="w-3 h-3 mr-1" /> Guangzhou detected
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {record.warehouse_confirmation ? (
                        <Badge className="bg-success/10 text-success border-success/30">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Confirmed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => confirmMutation.mutate(record.tracking_number)}
                          disabled={confirmMutation.isPending}
                        >
                          {confirmMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Warehouse className="w-4 h-4 mr-1" />
                          )}
                          Confirm Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
