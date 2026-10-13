import { useState } from "react";
import { Truck, MapPin, Phone, Mail, Globe, ChevronRight, Loader2, ExternalLink, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useDeliveryPartners, DeliveryPartner } from "@/hooks/useDeliveryPartners";
import { useCreateDeliveryRequest } from "@/hooks/useDeliveryRequests";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Upper East", "Upper West", "Volta", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah",
  "North East", "Brong Ahafo",
];

type FlowStep = "select-partner" | "address-form" | "summary" | "processing";

interface DeliveryPartnerFlowProps {
  containerId: string;
  containerNumber: string;
  totalCBM: number;
  invoiceId?: string;
  invoiceNumber?: string;
  onClose: () => void;
}

export function DeliveryPartnerFlow({
  containerId,
  containerNumber,
  totalCBM,
  invoiceId,
  invoiceNumber,
  onClose,
}: DeliveryPartnerFlowProps) {
  const [step, setStep] = useState<FlowStep>("select-partner");
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(null);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, profile } = useAuth();
  const { partners, isLoading: partnersLoading } = useDeliveryPartners();
  const createRequest = useCreateDeliveryRequest();
  const { toast } = useToast();

  // Estimate delivery cost based on region
  const estimatedCost = totalCBM > 0 ? Math.max(50, Math.round(totalCBM * 150 * 100) / 100) : 50;

  const validateAddress = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!region) newErrors.region = "Please select a region";
    if (!city.trim()) newErrors.city = "Please enter a city";
    if (!deliveryAddress.trim()) newErrors.deliveryAddress = "Please enter delivery address";
    if (!customerPhone.trim()) newErrors.customerPhone = "Please enter phone number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = async () => {
    if (!user?.id || !profile?.unique_code || !selectedPartner) return;

    setIsProcessing(true);
    setStep("processing");

    try {
      // Create delivery request
      const { data: deliveryResult, error: createError } = await supabase
        .from("delivery_requests" as any)
        .insert({
          user_id: user.id,
          user_code: profile.unique_code,
          container_id: containerId,
          invoice_id: invoiceId || null,
          delivery_partner_id: selectedPartner.id,
          region,
          city,
          delivery_address: deliveryAddress,
          customer_phone: customerPhone,
          amount: estimatedCost,
          delivery_cost: estimatedCost,
          payment_status: "pending",
          status: "requested",
          notes: `Delivery Partner: ${selectedPartner.name}\nRegion: ${region}\nCity: ${city}\nAddress: ${deliveryAddress}`,
        } as any)
        .select()
        .single();

      if (createError) throw createError;

      // Initiate Hubtel payment
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Authentication Error", description: "Please log in to continue", variant: "destructive" });
        setIsProcessing(false);
        setStep("summary");
        return;
      }

      const returnUrl = `${window.location.origin}/my-cargo?delivery_paid=true`;
      const cancellationUrl = `${window.location.origin}/my-cargo?delivery_cancelled=true`;

      const response = await supabase.functions.invoke("hubtel-delivery-checkout", {
        body: {
          deliveryRequestId: (deliveryResult as any).id,
          amount: estimatedCost,
          description: `Delivery - ${containerNumber} via ${selectedPartner.name}`,
          customerPhone,
          customerEmail: user?.email,
          customerName: profile?.full_name,
          returnUrl,
          cancellationUrl,
        },
      });

      if (response.error) throw new Error(response.error.message || "Payment initiation failed");

      const { checkoutUrl, checkoutDirectUrl } = response.data;
      if (checkoutUrl || checkoutDirectUrl) {
        toast({ title: "Redirecting to Payment", description: "You will be redirected to complete your payment..." });
        window.location.href = checkoutDirectUrl || checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Delivery payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
      setIsProcessing(false);
      setStep("summary");
    }
  };

  // Step 1: Partner Selection
  if (step === "select-partner") {
    return (
      <div className="space-y-4">
        <div className="text-center pb-2">
          <Truck className="w-10 h-10 mx-auto text-primary mb-2" />
          <h3 className="font-bold text-lg">Choose Delivery Partner</h3>
          <p className="text-sm text-muted-foreground">Select a trusted delivery company for your goods</p>
        </div>

        {partnersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {partners.map((partner) => (
              <Card
                key={partner.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedPartner?.id === partner.id
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedPartner(partner)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm">{partner.name}</h4>
                        {selectedPartner?.id === partner.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      {partner.service_description && (
                        <p className="text-xs text-muted-foreground mb-2">{partner.service_description}</p>
                      )}
                      <div className="space-y-1">
                        {partner.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" /> {partner.address}
                          </p>
                        )}
                        {partner.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {partner.phone}
                            {partner.alt_phone && ` / ${partner.alt_phone}`}
                          </p>
                        )}
                        {partner.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" /> {partner.email}
                          </p>
                        )}
                      </div>
                      {partner.coverage && (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          <Globe className="w-3 h-3 mr-1" /> {partner.coverage}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          disabled={!selectedPartner}
          onClick={() => setStep("address-form")}
        >
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // Step 2: Address Form
  if (step === "address-form") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep("select-partner")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Delivery Partner</p>
          <p className="font-semibold text-sm">{selectedPartner?.name}</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Region <span className="text-destructive">*</span></Label>
            <Select value={region} onValueChange={(v) => { setRegion(v); if (errors.region) setErrors(p => ({ ...p, region: "" })); }}>
              <SelectTrigger className={errors.region ? "border-destructive" : ""}>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {GHANA_REGIONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.region && <p className="text-xs text-destructive mt-1">{errors.region}</p>}
          </div>

          <div>
            <Label>City <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g., Tamale"
              value={city}
              onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors(p => ({ ...p, city: "" })); }}
              className={errors.city ? "border-destructive" : ""}
            />
            {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
          </div>

          <div>
            <Label>Delivery Address <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Enter full delivery address"
              value={deliveryAddress}
              onChange={(e) => { setDeliveryAddress(e.target.value); if (errors.deliveryAddress) setErrors(p => ({ ...p, deliveryAddress: "" })); }}
              className={`min-h-[70px] ${errors.deliveryAddress ? "border-destructive" : ""}`}
            />
            {errors.deliveryAddress && <p className="text-xs text-destructive mt-1">{errors.deliveryAddress}</p>}
          </div>

          <div>
            <Label>Phone Number <span className="text-destructive">*</span></Label>
            <Input
              type="tel"
              placeholder="e.g., 0550000000"
              value={customerPhone}
              onChange={(e) => { setCustomerPhone(e.target.value); if (errors.customerPhone) setErrors(p => ({ ...p, customerPhone: "" })); }}
              className={errors.customerPhone ? "border-destructive" : ""}
            />
            {errors.customerPhone && <p className="text-xs text-destructive mt-1">{errors.customerPhone}</p>}
          </div>
        </div>

        <Button className="w-full" onClick={() => { if (validateAddress()) setStep("summary"); }}>
          Review Summary <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // Step 3: Summary
  if (step === "summary") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep("address-form")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="text-center pb-2">
          <h3 className="font-bold text-lg">Delivery Summary</h3>
          <p className="text-sm text-muted-foreground">Review your delivery details</p>
        </div>

        <div className="space-y-3 p-4 bg-muted/50 rounded-xl border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Container</span>
            <span className="font-semibold font-mono">{containerNumber}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total CBM</span>
            <span className="font-semibold">{totalCBM.toFixed(3)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Partner</span>
            <span className="font-semibold">{selectedPartner?.name}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Region</span>
            <span className="font-semibold">{region}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">City</span>
            <span className="font-semibold">{city}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Address</span>
            <span className="font-semibold text-right max-w-[60%]">{deliveryAddress}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-semibold">{customerPhone}</span>
          </div>
          {invoiceNumber && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-semibold font-mono">{invoiceNumber}</span>
              </div>
            </>
          )}
        </div>

        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Estimated Delivery Cost</span>
            <span className="text-lg font-bold text-primary">GHS {estimatedCost.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleProceedToPayment}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Proceed to Payment
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You will be redirected to Hubtel's secure payment page
        </p>
      </div>
    );
  }

  // Step 4: Processing
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="font-semibold">Processing your delivery request...</p>
      <p className="text-sm text-muted-foreground">Please wait while we redirect you to payment</p>
    </div>
  );
}
