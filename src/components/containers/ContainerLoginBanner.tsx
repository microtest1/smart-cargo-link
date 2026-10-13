import { useState, useEffect } from "react";
import { X, Ship } from "lucide-react";
import { useContainers } from "@/hooks/useContainers";
import { format } from "date-fns";

export function ContainerLoginBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { containers, isLoading } = useContainers();

  // Find the most recently updated active container
  const latestContainer = containers
    .filter((c) => c.status !== "delivered")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  // Dismiss if already seen this session for this container
  useEffect(() => {
    if (latestContainer) {
      const dismissedId = sessionStorage.getItem("dismissed_container_banner");
      if (dismissedId === latestContainer.id) {
        setDismissed(true);
      }
    }
  }, [latestContainer]);

  const handleDismiss = () => {
    if (latestContainer) {
      sessionStorage.setItem("dismissed_container_banner", latestContainer.id);
    }
    setDismissed(true);
  };

  if (isLoading || dismissed || !latestContainer) return null;

  const statusLabel = latestContainer.status === "in_transit" ? "is in transit" :
    latestContainer.status === "arrived" ? "has arrived at the warehouse" :
    latestContainer.status === "loading" ? "is currently loading" : "has been updated";

  return (
    <div className="relative bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3">
      <Ship className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          📦 Container Update: <span className="font-bold">{latestContainer.container_number}</span> {statusLabel}.
          {latestContainer.estimated_arrival && (
            <> Estimated arrival: <span className="font-bold">{format(new Date(latestContainer.estimated_arrival), "MMMM d, yyyy")}</span>.</>
          )}
          {" "}({latestContainer.current_load} packages)
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
