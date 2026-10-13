import { Ship24TrackingResult } from "@/hooks/useShip24Tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, Warehouse, ArrowRight, UserPlus, KeyRound, Send, MessageSquare, MapPin, Loader2, CheckCircle, AlertTriangle, Package, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CourierTrackingViewProps {
  data: Ship24TrackingResult;
  isPolling?: boolean;
}

const statusColors: Record<string, string> = {
  "In Transit": "bg-cargo-blue/10 text-cargo-blue",
  "Picked Up": "bg-yellow-500/10 text-yellow-600",
  "Delivered": "bg-success/10 text-success",
  "Out for Delivery": "bg-cargo-teal/10 text-cargo-teal",
  "Exception": "bg-destructive/10 text-destructive",
  "Failed Attempt": "bg-destructive/10 text-destructive",
  "Available for Pickup": "bg-primary/10 text-primary",
  "Info Received": "bg-muted text-muted-foreground",
  "Pending": "bg-muted text-muted-foreground",
  "Registered": "bg-muted text-muted-foreground",
  "Unknown": "bg-muted text-muted-foreground",
};

// Shipment progress milestones
function ShipmentProgressMilestones({ data }: { data: Ship24TrackingResult }) {
  const hasEvents = data.events.length > 0;
  const isInGuangzhou = data.guangzhou_proximity?.detected || false;
  const isAtWarehouse = data.warehouse_detection.detected;
  const warehouseConfirmed = data.warehouse_confirmation || false;
  const isDelivered = data.is_delivered;

  const milestones = [
    {
      label: "Shipment Created",
      completed: hasEvents || data.status !== "Registered",
      icon: Package,
    },
    {
      label: "In Transit",
      completed: hasEvents && data.status !== "Info Received" && data.status !== "Registered",
      icon: Truck,
    },
    {
      label: "Arrived in Guangzhou",
      completed: isInGuangzhou || isAtWarehouse || warehouseConfirmed,
      pending: !isInGuangzhou && !isAtWarehouse && !warehouseConfirmed && hasEvents,
      icon: MapPin,
    },
    {
      label: warehouseConfirmed
        ? "Received at Amoliga Warehouse"
        : isAtWarehouse
          ? "Received at Amoliga Warehouse"
          : "Waiting for Warehouse Confirmation",
      completed: isAtWarehouse || warehouseConfirmed,
      pending: isInGuangzhou && !isAtWarehouse && !warehouseConfirmed,
      icon: Warehouse,
    },
    {
      label: "Awaiting Container Shipment",
      completed: false,
      pending: isAtWarehouse || warehouseConfirmed,
      icon: Ship,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Shipment Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            const isLast = index === milestones.length - 1;
            return (
              <div key={index} className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0",
                    milestone.completed
                      ? "bg-success text-success-foreground"
                      : milestone.pending
                        ? "bg-amber-500/20 text-amber-600 ring-2 ring-amber-500/30"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {milestone.completed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : milestone.pending ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-6 mt-0.5",
                      milestone.completed ? "bg-success/50" : "bg-border"
                    )} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={cn(
                    "text-sm font-medium",
                    milestone.completed
                      ? "text-foreground"
                      : milestone.pending
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  )}>
                    {milestone.completed ? "✔" : milestone.pending ? "⚠" : "○"} {milestone.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Guangzhou proximity alert card
function GuangzhouProximityAlert({ data }: { data: Ship24TrackingResult }) {
  if (!data.guangzhou_proximity?.detected || data.warehouse_detection.detected || data.warehouse_confirmation) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Arrived in Guangzhou
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Your shipment has arrived in Guangzhou, near the Amoliga Elite Freight & Logistics warehouse. 
              We are waiting for warehouse staff to confirm receipt of your package.
            </p>
            {data.guangzhou_proximity.arrival_time && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Detected: {data.guangzhou_proximity.arrival_time}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CourierTrackingView({ data, isPolling }: CourierTrackingViewProps) {
  return (
    <div className="space-y-4">
      {/* Polling indicator */}
      {isPolling && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Auto-checking for courier updates every 30 seconds...</span>
        </div>
      )}

      {/* Guangzhou Proximity Alert (only when NOT yet confirmed at warehouse) */}
      <GuangzhouProximityAlert data={data} />

      {/* Warehouse Detection Alert */}
      {data.warehouse_detection.detected && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <Warehouse className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-success mb-1">
                  ✔ Package received at Amoliga China Warehouse
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {data.warehouse_detection.message}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location: Guangzhou, China
                </p>
                
                {/* New Customer Guidance Steps */}
                <div className="space-y-4 mt-4">
                  <Card className="border bg-card">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-sm mb-3">New Customer? Follow these steps:</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <UserPlus className="w-3.5 h-3.5 text-primary" />
                              Create an account
                            </p>
                            <p className="text-xs text-muted-foreground">Sign up on the Amoliga Elite platform to register your shipment.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5 text-primary" />
                              Get your unique AEF code
                            </p>
                            <p className="text-xs text-muted-foreground">The system will generate your unique tracking code (e.g., AEF_00041).</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5 text-primary" />
                              Register your shipment
                            </p>
                            <p className="text-xs text-muted-foreground">Send your AEF code to Amoliga Elite so your goods can be registered for shipment to Ghana.</p>
                          </div>
                        </div>
                      </div>
                      <Link to="/signup">
                        <Button className="w-full mt-3" size="sm">
                          Create Free Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Existing Customer Guidance */}
                  <Card className="border border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Already have an account?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Please send your <span className="font-mono font-semibold text-primary">AEF_XXXXX</span> tracking code to Amoliga Elite Freight & Logistics so we can link your shipment to your account and begin tracking it from China to Ghana.
                      </p>
                      <Link to="/login">
                        <Button variant="outline" className="w-full mt-3" size="sm">
                          Login to Your Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Progress Milestones */}
      <ShipmentProgressMilestones data={data} />

      {/* Courier Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Tracking Details
            </CardTitle>
            <Badge className={cn("capitalize", statusColors[data.status] || statusColors["Unknown"])}>
              {data.status}
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
            <span>Tracking: <span className="font-mono font-medium text-foreground">{data.tracking_number}</span></span>
            <span>Courier: <span className="font-medium text-foreground capitalize">{data.courier_name}</span></span>
          </div>
          {data.current_location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              Current Location: <span className="font-medium text-foreground">{data.current_location}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Events Timeline */}
          {data.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{data.message || "Shipment registered. Tracking events will appear once the courier scans the package."}</p>
            </div>
          ) : (
            <div className="relative">
              {data.events.map((event, index) => {
                const isFirst = index === 0;
                const isLast = index === data.events.length - 1;
                
                return (
                  <div key={index} className="flex gap-3 pb-4 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full z-10 flex-shrink-0",
                        isFirst ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/30"
                      )} />
                      {!isLast && (
                        <div className="w-0.5 flex-1 mt-1 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className={cn(
                        "text-sm",
                        isFirst ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {event.context}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-delivery guidance when NOT at warehouse but delivered */}
      {data.is_delivered && !data.warehouse_detection.detected && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Shipment Delivered</h3>
                <p className="text-sm text-muted-foreground">
                  This shipment has been marked as delivered. If it was delivered to an Amoliga Elite warehouse, 
                  the system will automatically detect and confirm it. If you need assistance, please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
