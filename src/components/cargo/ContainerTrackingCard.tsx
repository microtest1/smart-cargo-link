import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ship, Package, Calendar, ChevronDown, Truck, CheckCircle2, Loader2, Box, Weight, MapPin, Anchor, BarChart3, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Container } from "@/hooks/useContainers";
import { useContainerItems } from "@/hooks/useContainerItems";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ContainerTrackingCardProps {
  container: Container;
  index?: number;
  onRequestDelivery?: (container: Container) => void;
  onSelectGoods?: (containerId: string) => void;
}

const containerStatuses = [
  { key: "loading", label: "Receiving", icon: Package },
  { key: "in_transit", label: "In Transit", icon: Ship },
  { key: "arrived", label: "Arrived", icon: Anchor },
  { key: "delivered", label: "Ready", icon: Truck },
];

// Color themes for containers - each gets a unique palette
const containerColorThemes = [
  {
    name: "ocean",
    accent: "210 100% 50%",
    accentLight: "210 100% 95%",
    accentMid: "210 100% 88%",
    gradient: "from-[hsl(210,100%,50%)] to-[hsl(210,80%,60%)]",
    border: "border-[hsl(210,100%,50%)]/30",
    bg: "bg-[hsl(210,100%,50%)]",
    bgLight: "bg-[hsl(210,100%,95%)]",
    text: "text-[hsl(210,100%,50%)]",
    textDark: "text-[hsl(210,100%,35%)]",
    dot: "bg-[hsl(210,100%,50%)]",
    ring: "ring-[hsl(210,100%,50%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(210,100%,50%,0.15)]",
  },
  {
    name: "emerald",
    accent: "160 84% 39%",
    accentLight: "160 60% 95%",
    accentMid: "160 60% 88%",
    gradient: "from-[hsl(160,84%,39%)] to-[hsl(160,70%,50%)]",
    border: "border-[hsl(160,84%,39%)]/30",
    bg: "bg-[hsl(160,84%,39%)]",
    bgLight: "bg-[hsl(160,60%,95%)]",
    text: "text-[hsl(160,84%,39%)]",
    textDark: "text-[hsl(160,84%,30%)]",
    dot: "bg-[hsl(160,84%,39%)]",
    ring: "ring-[hsl(160,84%,39%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(160,84%,39%,0.15)]",
  },
  {
    name: "violet",
    accent: "270 70% 55%",
    accentLight: "270 60% 96%",
    accentMid: "270 60% 90%",
    gradient: "from-[hsl(270,70%,55%)] to-[hsl(280,60%,65%)]",
    border: "border-[hsl(270,70%,55%)]/30",
    bg: "bg-[hsl(270,70%,55%)]",
    bgLight: "bg-[hsl(270,60%,96%)]",
    text: "text-[hsl(270,70%,55%)]",
    textDark: "text-[hsl(270,70%,40%)]",
    dot: "bg-[hsl(270,70%,55%)]",
    ring: "ring-[hsl(270,70%,55%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(270,70%,55%,0.15)]",
  },
  {
    name: "amber",
    accent: "32 95% 52%",
    accentLight: "32 90% 95%",
    accentMid: "32 90% 88%",
    gradient: "from-[hsl(32,95%,52%)] to-[hsl(45,93%,55%)]",
    border: "border-[hsl(32,95%,52%)]/30",
    bg: "bg-[hsl(32,95%,52%)]",
    bgLight: "bg-[hsl(32,90%,95%)]",
    text: "text-[hsl(32,95%,52%)]",
    textDark: "text-[hsl(32,95%,38%)]",
    dot: "bg-[hsl(32,95%,52%)]",
    ring: "ring-[hsl(32,95%,52%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(32,95%,52%,0.15)]",
  },
  {
    name: "teal",
    accent: "180 70% 40%",
    accentLight: "180 60% 95%",
    accentMid: "180 60% 88%",
    gradient: "from-[hsl(180,70%,40%)] to-[hsl(190,60%,50%)]",
    border: "border-[hsl(180,70%,40%)]/30",
    bg: "bg-[hsl(180,70%,40%)]",
    bgLight: "bg-[hsl(180,60%,95%)]",
    text: "text-[hsl(180,70%,40%)]",
    textDark: "text-[hsl(180,70%,30%)]",
    dot: "bg-[hsl(180,70%,40%)]",
    ring: "ring-[hsl(180,70%,40%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(180,70%,40%,0.15)]",
  },
  {
    name: "rose",
    accent: "350 80% 55%",
    accentLight: "350 70% 96%",
    accentMid: "350 70% 90%",
    gradient: "from-[hsl(350,80%,55%)] to-[hsl(0,70%,60%)]",
    border: "border-[hsl(350,80%,55%)]/30",
    bg: "bg-[hsl(350,80%,55%)]",
    bgLight: "bg-[hsl(350,70%,96%)]",
    text: "text-[hsl(350,80%,55%)]",
    textDark: "text-[hsl(350,80%,40%)]",
    dot: "bg-[hsl(350,80%,55%)]",
    ring: "ring-[hsl(350,80%,55%)]/20",
    shadow: "shadow-[0_4px_20px_hsl(350,80%,55%,0.15)]",
  },
];

function getTheme(index: number) {
  return containerColorThemes[index % containerColorThemes.length];
}

export function ContainerTrackingCard({ container, index = 0, onRequestDelivery, onSelectGoods }: ContainerTrackingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userCode = profile?.unique_code;
  const theme = getTheme(index);

  const { items, isLoading: itemsLoading } = useContainerItems(expanded ? container.id : undefined);
  // Items are already filtered server-side via RLS (container_items by user_code, packing_list_items by phone/code)
  const myItems = items;

  const totalCBM = myItems.reduce((sum, item) => sum + (item.total_cbm || 0), 0);
  const totalWeight = myItems.reduce((sum, item) => sum + (item.total_weight || 0), 0);
  const totalQuantity = myItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const currentStatusIndex = containerStatuses.findIndex(s => s.key === container.status);
  const canRequestDelivery = container.status === "arrived" || container.status === "delivered";

  return (
    <Card className={cn(
      "overflow-hidden border-2 transition-all duration-300 animate-fade-in",
      theme.border,
      theme.shadow,
      expanded && "ring-2 " + theme.ring
    )}>
      {/* Color accent bar */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", theme.gradient)} />

      {/* Container Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Container ID & Status */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", theme.bgLight)}>
                <Ship className={cn("w-5 h-5", theme.text)} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg truncate leading-tight">
                  {container.container_number}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>China → Ghana</span>
                  <span className="text-border">•</span>
                  <span>Sea Freight</span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 mt-2.5">
              <Badge variant="outline" className={cn("text-xs font-semibold border-2 px-2.5 py-0.5", theme.border, theme.textDark, theme.bgLight)}>
                <span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block animate-pulse", theme.dot)} />
                {containerStatuses.find(s => s.key === container.status)?.label || container.status}
              </Badge>
              {myItems.length > 0 && expanded && (
                <Badge variant="secondary" className="text-[10px]">
                  {myItems.length} shipment{myItems.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5 shrink-0">
            {container.estimated_arrival && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">ETA</p>
                <p className={cn("text-sm font-bold", theme.textDark)}>
                  {format(new Date(container.estimated_arrival), "dd MMM yyyy")}
                </p>
              </div>
            )}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
              expanded ? theme.bgLight : "bg-muted",
            )}>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-300",
                expanded ? "rotate-180 " + theme.text : "text-muted-foreground"
              )} />
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between relative">
            {/* Connection line */}
            <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-border" />
            <div
              className={cn("absolute top-4 left-[12%] h-0.5 transition-all duration-500", theme.bg)}
              style={{ width: `${currentStatusIndex >= 0 ? (currentStatusIndex / (containerStatuses.length - 1)) * 76 : 0}%` }}
            />

            {containerStatuses.map((status, idx) => {
              const isActive = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const StatusIcon = status.icon;
              return (
                <div key={status.key} className="flex flex-col items-center gap-1.5 z-10 relative" style={{ width: `${100 / containerStatuses.length}%` }}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCurrent
                      ? cn(theme.bg, "border-transparent text-white shadow-md scale-110")
                      : isActive
                        ? cn(theme.bgLight, theme.border, theme.text)
                        : "bg-muted border-border text-muted-foreground/40"
                  )}>
                    <StatusIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className={cn(
                    "text-[9px] sm:text-[10px] text-center leading-tight font-medium",
                    isCurrent ? theme.textDark : isActive ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dates row */}
        {container.departure_date && (
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Departed: {format(new Date(container.departure_date), "dd MMM yyyy")}
            </span>
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t animate-slide-up">
          <CardContent className="p-4 sm:p-5">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading your shipments...</span>
              </div>
            ) : myItems.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No items assigned to your code ({userCode})
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Items will appear once assigned to this container
                </p>
              </div>
            ) : (
              <>
                {/* Shipment Table */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className={cn("w-4 h-4", theme.text)} />
                    Your Shipments
                    <Badge variant="secondary" className="text-[10px] ml-1">{myItems.length}</Badge>
                  </h4>

                  <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg border">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className={cn(theme.bgLight)}>
                          <th className={cn("text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider", theme.textDark)}>Shipping Mark</th>
                          <th className={cn("text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider", theme.textDark)}>Product</th>
                          <th className={cn("text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider", theme.textDark)}>Qty</th>
                          <th className={cn("text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider", theme.textDark)}>CBM</th>
                          <th className={cn("text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider", theme.textDark)}>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myItems.map((item, i) => (
                          <tr key={item.id} className={cn(
                            "border-t border-border/50 transition-colors hover:bg-muted/40",
                            i % 2 === 0 ? "bg-card" : "bg-muted/20"
                          )}>
                            <td className="py-3 px-3">
                              <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold", theme.border, theme.textDark)}>
                                {item.user_code || "—"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-medium text-sm">{item.item_name}</p>
                              {item.item_name_chinese && (
                                <p className="text-[11px] text-muted-foreground">{item.item_name_chinese}</p>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold">{item.quantity}</td>
                            <td className="py-3 px-3 text-right font-mono text-xs font-semibold">{item.total_cbm.toFixed(3)}</td>
                            <td className="py-3 px-3 text-right font-mono text-xs">{item.total_weight?.toFixed(0) || "—"} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/containers/${container.id}`);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {canRequestDelivery && onRequestDelivery && (
                    <Button
                      className={cn("flex-1 bg-gradient-to-r text-white font-semibold shadow-md hover:opacity-90 transition-opacity", theme.gradient)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelivery(container);
                      }}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Request Delivery
                    </Button>
                  )}
                  {onSelectGoods && (
                    <Button
                      variant={canRequestDelivery ? "outline" : "default"}
                      className={cn(
                        "flex-1 font-semibold",
                        !canRequestDelivery && cn("bg-gradient-to-r text-white shadow-md hover:opacity-90", theme.gradient)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGoods(container.id);
                      }}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Select for Invoice
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </div>
      )}
    </Card>
  );
}
