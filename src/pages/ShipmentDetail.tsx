import { AppLayout } from "@/components/layout/AppLayout";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { RequestDeliveryButton } from "@/components/cargo/RequestDeliveryButton";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Package, 
  Building2, 
  MapPin, 
  Calendar, 
  Weight, 
  Phone,
  MessageCircle,
  Copy,
  Check,
  Ship
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useShipmentById } from "@/hooks/useShipments";
import { format } from "date-fns";

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { shipment, isLoading, error } = useShipmentById(id || "");

  const handleCopy = () => {
    if (shipment?.tracking_number) {
      navigator.clipboard.writeText(shipment.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <AppLayout showNav={false} showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading shipment...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !shipment) {
    return (
      <AppLayout showNav={false} showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display font-bold text-xl">Shipment not found</h2>
            <p className="text-muted-foreground">This shipment doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate("/shipments")}>Back to Shipments</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const companyPhone = shipment.companies?.phone || "+233 20 887 8817";
  const companyWhatsapp = shipment.companies?.whatsapp || "+233208878817";

  return (
    <AppLayout showNav={false} showHeader={false}>
      {/* Custom Header */}
      <header className="sticky top-0 z-40 gradient-hero text-primary-foreground safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold">Shipment Details</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Tracking Number Card */}
        <div className="px-4 pb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">Tracking Number</p>
                <p className="font-display font-bold text-xl tracking-wide">
                  {shipment.tracking_number}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="text-primary-foreground hover:bg-white/10"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-6 pb-24">
        {/* Product Info */}
        <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold mb-4">Package Details</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="font-medium">{shipment.product}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cargo-blue/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-cargo-blue" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shipping Company</p>
                <p className="font-medium">{shipment.companies?.name || "Amoliga Elite Freight"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Weight className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="font-medium">{shipment.weight ? `${shipment.weight} kg` : "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Delivery</p>
                  <p className="font-medium">
                    {shipment.estimated_delivery 
                      ? format(new Date(shipment.estimated_delivery), "MMM d, yyyy")
                      : "TBD"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Route */}
        <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold mb-4">Shipping Route</h3>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-cargo-orange" />
              <div className="w-0.5 h-12 bg-border" />
              <div className="w-3 h-3 rounded-full bg-cargo-teal" />
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground">Origin</p>
                <p className="font-medium">{shipment.origin}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-medium">{shipment.destination}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recipient details */}
        {(shipment.customer_name || shipment.customer_phone || shipment.customer_location) && (
          <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
            <h3 className="font-display font-semibold mb-4">Recipient Details</h3>
            <div className="space-y-3 text-sm">
              {shipment.customer_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{shipment.customer_name}</p>
                </div>
              )}
              {shipment.customer_phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium font-mono">{shipment.customer_phone}</p>
                </div>
              )}
              {shipment.customer_location && (
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{shipment.customer_location}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {shipment.service_type === "vehicle" && (
          <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
            <h3 className="font-display font-semibold mb-4">Vehicle Details</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Chassis / VIN / Serial</p><p className="font-medium break-words">{shipment.vehicle_identifier}</p></div>
              <div><p className="text-xs text-muted-foreground">Model</p><p className="font-medium">{shipment.vehicle_model}</p></div>
              <div><p className="text-xs text-muted-foreground">Year</p><p className="font-medium">{shipment.vehicle_year}</p></div>
            </div>
          </section>
        )}



        {/* Timeline */}
        <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold mb-6">Tracking History</h3>
          <TrackingTimeline currentStatus={shipment.status} />
        </section>

        {/* Request Delivery */}
        {(shipment.status === "in-transit" || shipment.status === "in_transit" || shipment.status === "pending" || shipment.status === "received_china" || shipment.status === "processing" || shipment.status === "arrived" || shipment.status === "arrived_ghana") && (
          <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Request Delivery
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ready to receive your package? Request delivery to your Ghana location.
            </p>
            <RequestDeliveryButton
              shipmentId={shipment.id}
              trackingNumber={shipment.tracking_number}
              productName={shipment.product}
            />
          </section>
        )}

        {/* Contact Company */}
        <section className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold mb-4">Need Help?</h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`tel:${companyPhone}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              onClick={() => window.open(`https://wa.me/${companyWhatsapp.replace(/\D/g, '')}`)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
