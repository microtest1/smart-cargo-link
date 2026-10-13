import { MapPin, Calendar, ChevronRight, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStage } from "@/lib/shipmentStages";

interface ShipmentCardProps {
  trackingNumber: string;
  product: string;
  status: string;
  origin: string;
  destination: string;
  date: string;
  company: string;
  weight?: string;
  onClick?: () => void;
}

export function ShipmentCard({
  trackingNumber,
  product,
  status,
  origin,
  destination,
  date,
  company,
  weight,
  onClick,
}: ShipmentCardProps) {
  const stage = getStage(status);
  const StageIcon = stage.icon;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border border-border/50 animate-scale-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
            <StageIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">{trackingNumber}</p>
            <p className="text-xs text-muted-foreground">{company}</p>
          </div>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
            stage.color
          )}
        >
          {stage.emoji} {stage.label}
        </span>
      </div>

      <p className="font-medium mb-3 line-clamp-1">{product}</p>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cargo-orange flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{origin}</span>
        </div>
        <div className="flex items-center px-2">
          <div className="w-8 h-[2px] bg-border" />
          <Truck className="w-4 h-4 text-cargo-orange mx-1" />
          <div className="w-8 h-[2px] bg-border" />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-xs text-muted-foreground truncate">{destination}</span>
          <div className="w-2 h-2 rounded-full bg-cargo-teal flex-shrink-0" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {date}
          </span>
          {weight && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {weight}
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  );
}
