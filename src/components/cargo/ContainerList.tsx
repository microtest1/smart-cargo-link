import { Package, Ship, Calendar, CheckCircle2, Loader2, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useContainers } from "@/hooks/useContainers";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  loading: { label: "Loading", color: "bg-yellow-500", icon: Package },
  in_transit: { label: "In Transit", color: "bg-blue-500", icon: Ship },
  arrived: { label: "Arrived", color: "bg-green-500", icon: CheckCircle2 },
  delivered: { label: "Delivered", color: "bg-gray-500", icon: Truck },
};

export function ContainerList() {
  const { containers, isLoading } = useContainers();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Available Containers
        </CardTitle>
        <CardDescription>
          View active containers and their status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {containers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ship className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No containers available yet</p>
          </div>
        ) : (
          containers.map((container) => {
            const status = statusConfig[container.status] || statusConfig.loading;
            const StatusIcon = status.icon;
            const loadPercentage = (container.current_load / container.capacity) * 100;

            return (
              <div
                key={container.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{container.container_number}</h4>
                    <Badge className={`${status.color} text-white mt-1`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="text-right text-sm">
                    {container.departure_date && (
                      <p className="text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Departs: {format(new Date(container.departure_date), "MMM dd, yyyy")}
                      </p>
                    )}
                    {container.estimated_arrival && (
                      <p className="text-primary font-medium">
                        ETA: {format(new Date(container.estimated_arrival), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">
                      {container.current_load} / {container.capacity} items
                    </span>
                  </div>
                  <Progress value={loadPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {loadPercentage.toFixed(0)}% full
                  </p>
                </div>

                {container.notes && (
                  <p className="text-sm text-muted-foreground mt-3 italic">
                    {container.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
