import { Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: number;
  icon: typeof Package;
  color: string;
  bgColor: string;
}

interface QuickStatsProps {
  stats?: {
    active: number;
    pending: number;
    delivered: number;
    total: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems: StatItem[] = [
    { label: "Active", value: stats?.active || 0, icon: Truck, color: "text-cargo-blue", bgColor: "bg-cargo-blue/10" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-cargo-orange", bgColor: "bg-cargo-orange/10" },
    { label: "Delivered", value: stats?.delivered || 0, icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
    { label: "Total", value: stats?.total || 0, icon: Package, color: "text-cargo-navy", bgColor: "bg-cargo-navy/10" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl p-3 border border-border/50 shadow-card text-center"
        >
          <div className={cn("w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center", stat.bgColor)}>
            <stat.icon className={cn("w-4 h-4", stat.color)} />
          </div>
          <p className="font-display font-bold text-xl">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
