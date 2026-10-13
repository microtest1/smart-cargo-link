import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTimelineSteps } from "@/lib/shipmentStages";

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  date?: string;
  completed: boolean;
  current?: boolean;
  icon: typeof Package;
}

interface TrackingTimelineProps {
  steps?: TimelineStep[];
  currentStatus?: string | null;
}

export function TrackingTimeline({ steps, currentStatus }: TrackingTimelineProps) {
  const resolvedSteps: TimelineStep[] =
    steps ?? (buildTimelineSteps(currentStatus ?? "received_china") as TimelineStep[]);
  return <TimelineBody steps={resolvedSteps} />;
}

function TimelineBody({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative">
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-4 pb-8 last:pb-0">
          {/* Line & Icon */}
          <div className="relative flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300",
                step.completed
                  ? step.current
                    ? "gradient-accent shadow-glow"
                    : "bg-success"
                  : "bg-muted border-2 border-border"
              )}
            >
              <step.icon
                className={cn(
                  "w-5 h-5",
                  step.completed ? "text-accent-foreground" : "text-muted-foreground"
                )}
              />
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 mt-2 transition-all duration-300",
                  step.completed ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className={cn("flex-1 pt-2", step.current && "animate-pulse-slow")}>
            <div className="flex items-center gap-2 mb-1">
              <h4 className={cn(
                "font-semibold",
                step.completed ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </h4>
              {step.current && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">
                  Current
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            {step.date && (
              <p className="text-xs text-muted-foreground mt-1">{step.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
