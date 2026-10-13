import { Truck, Package, Clock, CheckCircle2, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeliveryRequests } from "@/hooks/useDeliveryRequests";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  requested: { label: "Pending", color: "bg-orange-100 text-orange-700", icon: Clock },
  processing: { label: "Assigned", color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-700", icon: Truck },
  completed: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: Clock },
};

export function CustomerDeliveryTracker() {
  const { requests, isLoading } = useDeliveryRequests();

  const activeRequests = requests.filter(
    (r: any) => r.status !== "cancelled" && r.status !== "completed"
  );

  if (isLoading || activeRequests.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm flex items-center gap-2 px-1">
        <Truck className="w-4 h-4 text-primary" />
        Active Deliveries
      </h3>
      {activeRequests.map((req: any) => {
        const config = statusConfig[req.status] || statusConfig.requested;
        const StatusIcon = config.icon;
        return (
          <Card key={req.id} className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Delivery</span>
                </div>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
              {req.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{req.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(req.created_at), "dd MMM yyyy HH:mm")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
