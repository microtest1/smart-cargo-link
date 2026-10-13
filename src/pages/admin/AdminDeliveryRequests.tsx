import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Loader2, Calendar, MapPin, Phone, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useUpdateDeliveryRequest, useDeleteDeliveryRequest } from "@/hooks/useDeliveryRequests";

const STATUSES = ["requested", "processing", "out_for_delivery", "completed", "cancelled"];

const statusColors: Record<string, string> = {
  requested: "bg-orange-100 text-orange-700",
  processing: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const statusLabels: Record<string, string> = {
  requested: "Pending",
  processing: "Assigned",
  out_for_delivery: "Out for Delivery",
  completed: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminDeliveryRequests() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-delivery-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests" as any)
        .select(`
          *,
          delivery_partners:delivery_partner_id (name, phone)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateRequest = useUpdateDeliveryRequest();
  const deleteRequest = useDeleteDeliveryRequest();

  return (
    <AdminLayout title="Delivery Orders">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Delivery Orders
          </h1>
          <p className="text-muted-foreground">Manage customer delivery requests and track fulfillment</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No delivery orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{req.user_code}</Badge>
                        <Badge className={statusColors[req.status] || "bg-gray-100 text-gray-700"}>
                          {statusLabels[req.status] || req.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Payment: {req.payment_status}
                        </Badge>
                      </div>

                      {req.delivery_partners && (
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {req.delivery_partners.name}
                        </p>
                      )}

                      {(req.region || req.city || req.delivery_address) && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          {[req.delivery_address, req.city, req.region].filter(Boolean).join(", ")}
                        </p>
                      )}

                      {req.customer_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {req.customer_phone}
                        </p>
                      )}

                      {req.amount && (
                        <p className="text-sm font-semibold text-primary">
                          GHS {Number(req.amount).toFixed(2)}
                        </p>
                      )}

                      {req.notes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{req.notes}</p>
                      )}

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(req.created_at), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Select
                        value={req.status}
                        onValueChange={(value) => updateRequest.mutate({ id: req.id, status: value })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRequest.mutate(req.id)}
                      >
                        Delete
                      </Button>
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
