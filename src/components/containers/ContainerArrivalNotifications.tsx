import { Ship, Package, Calendar, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useContainers } from "@/hooks/useContainers";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ContainerArrivalNotificationsProps {
  compact?: boolean;
  maxItems?: number;
}

export function ContainerArrivalNotifications({ compact = false, maxItems }: ContainerArrivalNotificationsProps) {
  const { containers, isLoading } = useContainers();

  // Show active containers (not delivered)
  const activeContainers = containers
    .filter((c) => c.status !== "delivered")
    .slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeContainers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Ship className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No active containers at the moment</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "loading":
        return { label: "Loading", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "🏗️" };
      case "in_transit":
        return { label: "In Transit", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "🚢" };
      case "arrived":
        return { label: "Arrived", bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "✅" };
      default:
        return { label: status, bg: "bg-muted text-muted-foreground", icon: "📦" };
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {activeContainers.map((container) => {
          const statusConfig = getStatusConfig(container.status);
          return (
            <div
              key={container.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{statusConfig.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{container.container_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {container.estimated_arrival
                      ? `ETA: ${format(new Date(container.estimated_arrival), "MMM d, yyyy")}`
                      : "ETA: TBD"}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", statusConfig.bg)}>
                  {statusConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">{container.current_load} pkgs</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-lg flex items-center gap-2">
        <Ship className="w-5 h-5 text-primary" />
        Container Arrival Notifications
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Container</th>
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Est. Arrival</th>
              <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Packages</th>
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeContainers.map((container) => {
              const statusConfig = getStatusConfig(container.status);
              return (
                <tr key={container.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{statusConfig.icon}</span>
                      <span className="font-semibold">{container.container_number}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", statusConfig.bg)}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {container.estimated_arrival
                      ? format(new Date(container.estimated_arrival), "MMM d, yyyy")
                      : "TBD"}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{container.current_load}</td>
                  <td className="py-3 px-3 text-muted-foreground text-xs">
                    {format(new Date(container.updated_at), "MMM d, yyyy")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
