import { Package, Calendar, Hash, MapPin, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WarehouseUpdateCardProps {
  update: {
    id: string;
    tracking_number: string;
    product_name: string;
    product_details?: string | null;
    quantity_received: number;
    fulfillment_date: string;
    status: string;
    created_at: string;
    containers?: {
      container_number: string;
      status?: string;
      estimated_arrival?: string | null;
    } | null;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  received: { label: "Received at Warehouse", color: "bg-cargo-blue/10 text-cargo-blue", icon: Package },
  processing: { label: "Processing", color: "bg-warning/10 text-warning", icon: Package },
  shipped: { label: "Shipped", color: "bg-cargo-teal/10 text-cargo-teal", icon: MapPin },
  delivered: { label: "Delivered", color: "bg-success/10 text-success", icon: CheckCircle },
};

export function WarehouseUpdateCard({ update }: WarehouseUpdateCardProps) {
  const config = statusConfig[update.status] || statusConfig.received;
  const StatusIcon = config.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.color)}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{update.product_name}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{update.tracking_number}</p>
            </div>
          </div>
          <Badge className={cn("shrink-0", config.color)}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {update.product_details && (
          <p className="text-sm text-muted-foreground">{update.product_details}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span>Qty: {update.quantity_received}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{format(new Date(update.fulfillment_date), "MMM d, yyyy")}</span>
          </div>
        </div>

        {update.containers && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Container:</span>
              <span className="font-mono">{update.containers.container_number}</span>
            </div>
            {update.containers.estimated_arrival && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Est. Arrival:</span>
                <span>{format(new Date(update.containers.estimated_arrival), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
