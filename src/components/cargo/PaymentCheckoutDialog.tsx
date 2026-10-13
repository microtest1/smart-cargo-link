import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectionData } from "./GoodsSelectionDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FulfillmentType } from "@/hooks/useOrderFulfillments";
import { useDeliveryZones, calculateDeliveryFee } from "@/hooks/useContainerItems";
import {
  CreditCard,
  Receipt,
  Loader2,
  CheckCircle2,
  Copy,
  MessageCircle,
  User,
  Users,
  Truck,
  Phone,
  MapPin,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
} from "lucide-react";

interface PaymentCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionData: SelectionData | null;
}

const fulfillmentOptions = [
  { id: "self_pickup" as FulfillmentType, label: "Self Pickup", description: "I will personally pick up my goods", icon: User },
  { id: "delivery" as FulfillmentType, label: "Delivery", description: "Deliver to my location", icon: Truck },
  { id: "third_party_pickup" as FulfillmentType, label: "Third-Party Pickup", description: "Someone else will collect", icon: Users },
];

export function PaymentCheckoutDialog({
  open,
  onOpenChange,
  selectionData,
}: PaymentCheckoutDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ghanaRegions, westAfricanCountries, isLoading: zonesLoading } = useDeliveryZones();

  const [step, setStep] = useState<"fulfillment" | "processing" | "payment" | "checking" | "complete">("fulfillment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "verified" | "rejected">("pending");

  // Fulfillment state - MANDATORY
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | "">("");
  const [contactPhone, setContactPhone] = useState(profile?.phone || "");
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [thirdPartyPhone, setThirdPartyPhone] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryDistance, setDeliveryDistance] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!selectionData) return null;

  // CRITICAL: Validate container ID is present
  const containerId = selectionData.containerId;
  
  const allZones = [...ghanaRegions, ...westAfricanCountries];
  const selectedZone = allZones.find((z) => z.id === selectedZoneId) || null;
  
  // Distance-based delivery fee calculation
  const distanceKm = parseFloat(deliveryDistance) || 0;
  const distanceBasedFee = distanceKm > 0 ? distanceKm * 5 : 0;
  const zoneBasedFee = selectedZone && fulfillmentType === "delivery" 
    ? calculateDeliveryFee(selectedZone, selectionData.totalCbm) 
    : 0;
  const deliveryFee = fulfillmentType === "delivery" ? zoneBasedFee + distanceBasedFee : 0;
  const totalWithDelivery = selectionData.totalAmount + deliveryFee;

  const validateFulfillment = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fulfillmentType) newErrors.fulfillmentType = "Please select a fulfillment option";
    if (!contactPhone.trim()) newErrors.contactPhone = "Contact phone is required";
    if (fulfillmentType === "delivery") {
      if (!selectedZoneId) newErrors.deliveryZone = "Please select a delivery zone";
      if (!deliveryAddress.trim()) newErrors.deliveryAddress = "Please enter your delivery address";
      if (!deliveryDistance.trim() || parseFloat(deliveryDistance) <= 0) newErrors.deliveryDistance = "Please enter the distance in kilometers";
    }
    if (fulfillmentType === "third_party_pickup" && !thirdPartyName.trim()) newErrors.thirdPartyName = "Third party name is required";
    if (!containerId) newErrors.container = "Container is required for invoice generation";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateInvoiceAndInitiatePayment = async () => {
    if (!user || !profile) {
      toast({ title: "Authentication Error", description: "Please log in", variant: "destructive" });
      return;
    }

    // CRITICAL: Require container ID
    if (!containerId) {
      toast({ title: "Container Missing", description: "Cannot create invoice without a container", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setStep("processing");

    try {
      // Generate invoice number
      const { data: invNum, error: invNumError } = await supabase.rpc(
        "generate_invoice_number" as any
      );
      if (invNumError) throw invNumError;

      // Generate tracking number
      const trackNum = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      // Calculate totals
      const totalWeight = selectionData.items.reduce(
        (sum, i) => sum + (i.item.total_weight || 0),
        0
      );
      const totalCartons = selectionData.items.reduce(
        (sum, i) => sum + (i.item.carton_count || 0),
        0
      );

      // Determine destination based on fulfillment type
      const destination = fulfillmentType === "delivery" && selectedZone 
        ? selectedZone.zone_name 
        : "Self Pickup - Ghana";

      // Create shipment - BOUND TO CONTAINER
      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          user_id: user.id,
          user_code: profile.unique_code,
          company_id: "b164ed21-bae1-447b-bd0d-2465c476d247", // Amoliga Elite Freight & Logistics
          container_id: containerId,
          tracking_number: trackNum,
          product: selectionData.items.map((i) => i.item.item_name).join(", "),
          origin: "China (Nansha)",
          destination: destination,
          weight: totalWeight,
          dimensions: `${selectionData.totalCbm.toFixed(4)} CBM | ${totalCartons} CTN`,
          status: "pending",
          estimated_delivery: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          notes: `Container bound. Fulfillment: ${fulfillmentType}. Items: ${selectionData.items.length}`,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create invoice - BOUND TO CONTAINER
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invNum,
          user_id: user.id,
          user_code: profile.unique_code,
          shipment_id: shipment.id,
          container_id: containerId,
          amount: selectionData.totalAmount - deliveryFee,
          tax_amount: deliveryFee,
          total_amount: totalWithDelivery,
          status: "pending",
          notes: `CBM: ${selectionData.totalCbm.toFixed(4)}. Fulfillment: ${fulfillmentType}. Items: ${selectionData.items
            .map((i) => `${i.item.item_name} x${i.quantity}`)
            .join(", ")}`,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create fulfillment record - MANDATORY
      await supabase.from("order_fulfillments" as any).insert({
        invoice_id: invoice.id,
        container_id: containerId,
        user_id: user.id,
        user_code: profile.unique_code,
        fulfillment_type: fulfillmentType,
        contact_phone: contactPhone,
        third_party_name: fulfillmentType === "third_party_pickup" ? thirdPartyName : null,
        third_party_phone: fulfillmentType === "third_party_pickup" ? thirdPartyPhone : null,
        delivery_zone_id: fulfillmentType === "delivery" ? selectedZoneId : null,
        delivery_address: fulfillmentType === "delivery" ? `${deliveryAddress}${deliveryLandmark ? ` (Landmark: ${deliveryLandmark})` : ''} | Distance: ${deliveryDistance}km` : null,
        notes: fulfillmentType === "delivery" ? `Distance: ${deliveryDistance}km | Fee: GH₵${deliveryFee.toFixed(2)}` : null,
        status: "pending",
      });

      // Save customer selections - BOUND TO CONTAINER
      for (const si of selectionData.items) {
        await supabase.from("customer_goods_selections" as any).insert({
          container_item_id: si.item.id,
          container_id: containerId,
          quantity_selected: si.quantity,
          cbm_calculated: si.cbm,
          user_id: user.id,
          user_code: profile.unique_code || "",
          status: "invoiced",
          shipment_id: shipment.id,
          invoice_id: invoice.id,
        });
      }

      // Create delivery request if delivery type
      if (fulfillmentType === "delivery" && selectedZone) {
        await supabase.from("delivery_requests").insert({
          user_id: user.id,
          user_code: profile.unique_code,
          shipment_id: shipment.id,
          amount: deliveryFee,
          status: "requested",
          payment_status: "pending",
          notes: `Delivery to ${selectedZone.zone_name}. Address: ${deliveryAddress}. Distance: ${deliveryDistance}km. CBM: ${selectionData.totalCbm.toFixed(4)}`,
        });
      }

      setInvoiceNumber(invNum);
      setTrackingNumber(trackNum);
      setInvoiceId(invoice.id);

      // Initiate Hubtel payment
      const returnUrl = `${window.location.origin}/invoices?payment=success&invoice=${invoice.id}`;
      const cancellationUrl = `${window.location.origin}/invoices?payment=cancelled&invoice=${invoice.id}`;

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Authentication required");

      const response = await supabase.functions.invoke("hubtel-checkout", {
        body: {
          invoiceId: invoice.id,
          amount: totalWithDelivery,
          description: `Payment for Invoice ${invNum} - Amoliga Elite Freight`,
          customerPhone: contactPhone,
          customerEmail: profile.email,
          customerName: profile.full_name,
          returnUrl: returnUrl,
          cancellationUrl: cancellationUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to initialize payment");
      }

      const hubtelData = response.data;

      if (!hubtelData.success || !hubtelData.checkoutUrl) {
        throw new Error(hubtelData.error || "Failed to get checkout URL");
      }

      setCheckoutUrl(hubtelData.checkoutUrl);
      setClientReference(hubtelData.clientReference);
      setStep("payment");

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-selections"] });
      queryClient.invalidateQueries({ queryKey: ["order-fulfillments"] });
      queryClient.invalidateQueries({ queryKey: ["container-items"] });

      toast({
        title: "Invoice Created!",
        description: `Invoice ${invNum} generated. Please complete payment.`,
      });
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
      setStep("fulfillment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!invoiceId && !clientReference) return;

    setStep("checking");

    try {
      const response = await supabase.functions.invoke("hubtel-status", {
        body: {
          invoiceId: invoiceId,
          clientReference: clientReference,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const statusData = response.data;

      if (statusData.status === "verified") {
        setPaymentStatus("verified");
        setStep("complete");
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
        toast({
          title: "Payment Confirmed! ✅",
          description: "Your payment has been verified successfully.",
        });
      } else if (statusData.status === "rejected") {
        setPaymentStatus("rejected");
        setStep("payment");
        toast({
          title: "Payment Failed",
          description: "Your payment was not successful. Please try again.",
          variant: "destructive",
        });
      } else {
        setStep("payment");
        toast({
          title: "Payment Pending",
          description: "Your payment is still being processed. Please complete it or wait a moment.",
        });
      }
    } catch (error: any) {
      console.error("Status check error:", error);
      setStep("payment");
      toast({
        title: "Status Check Failed",
        description: "Could not verify payment status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Hello Amoliga Elite! I just placed an order.\n\nInvoice: ${invoiceNumber}\nTracking: ${trackingNumber}\nFulfillment: ${fulfillmentType}\nAmount: $${totalWithDelivery.toFixed(2)}\n\nPlease confirm my order.`
    );
    window.open(`https://wa.me/233208878817?text=${message}`, "_blank");
  };

  const handleClose = () => {
    setStep("fulfillment");
    setInvoiceNumber("");
    setTrackingNumber("");
    setInvoiceId("");
    setClientReference("");
    setCheckoutUrl("");
    setPaymentStatus("pending");
    setFulfillmentType("");
    setContactPhone(profile?.phone || "");
    setThirdPartyName("");
    setThirdPartyPhone("");
    setSelectedZoneId("");
    setDeliveryAddress("");
    setDeliveryLandmark("");
    setDeliveryDistance("");
    setErrors({});
    onOpenChange(false);
  };

  const handleProceedToPayment = () => {
    if (!validateFulfillment()) return;
    handleCreateInvoiceAndInitiatePayment();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {step === "complete" ? "Payment Confirmed!" : step === "payment" ? "Complete Payment" : step === "processing" || step === "checking" ? "Processing..." : "Select Fulfillment"}
          </DialogTitle>
          <DialogDescription>
            {step === "fulfillment" && "Choose how you'll receive your goods (required)"}
            {step === "processing" && "Creating your invoice and initializing payment..."}
            {step === "payment" && "Complete your payment via Hubtel"}
            {step === "checking" && "Verifying your payment status..."}
            {step === "complete" && "Your order has been confirmed"}
          </DialogDescription>
        </DialogHeader>

        {/* Container validation warning */}
        {!containerId && step === "fulfillment" && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-destructive">Container Missing</p>
              <p className="text-xs text-muted-foreground">Cannot proceed without a valid container.</p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        {step !== "complete" && step !== "processing" && step !== "checking" && containerId && (
          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{selectionData.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total CBM:</span>
              <span>{selectionData.totalCbm.toFixed(4)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>GH₵{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-primary">${totalWithDelivery.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Step: Fulfillment Selection - MANDATORY */}
        {step === "fulfillment" && containerId && (
          <div className="space-y-4">
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Required Selection</p>
                <p className="text-xs text-muted-foreground">You must select how you'll receive your goods before proceeding.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Fulfillment Method <span className="text-destructive">*</span></Label>
              <RadioGroup value={fulfillmentType} onValueChange={(v) => { setFulfillmentType(v as FulfillmentType); setErrors({}); }} className="space-y-2">
                {fulfillmentOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${fulfillmentType === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => { setFulfillmentType(option.id); setErrors({}); }}
                  >
                    <RadioGroupItem value={option.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4 text-primary" />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              {errors.fulfillmentType && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.fulfillmentType}</p>}
            </div>

            <div className="space-y-2">
              <Label>Contact Phone <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="+233 XX XXX XXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={`pl-10 ${errors.contactPhone ? "border-destructive" : ""}`} />
              </div>
              {errors.contactPhone && <p className="text-sm text-destructive">{errors.contactPhone}</p>}
            </div>

            {/* Delivery Options */}
            {fulfillmentType === "delivery" && (
              <div className="space-y-4 p-4 bg-accent/10 rounded-lg border border-accent/30">
                <h4 className="font-medium flex items-center gap-2"><Truck className="w-4 h-4" />Delivery Details</h4>
                
                {/* Delivery Zone */}
                <div className="space-y-2">
                  <Label>Delivery Zone <span className="text-destructive">*</span></Label>
                  <Select value={selectedZoneId} onValueChange={(val) => { setSelectedZoneId(val); setErrors(prev => ({...prev, deliveryZone: ''})); }}>
                    <SelectTrigger className={errors.deliveryZone ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select your region/country" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                      {zonesLoading ? <SelectItem value="loading" disabled>Loading zones...</SelectItem> : (
                        <>
                          <SelectItem value="header-ghana" disabled className="font-semibold text-primary">— Ghana Regions —</SelectItem>
                          {ghanaRegions.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.zone_name} (Base: GH₵{zone.base_fee})
                            </SelectItem>
                          ))}
                          <SelectItem value="header-wa" disabled className="font-semibold text-primary mt-2">— West African Countries —</SelectItem>
                          {westAfricanCountries.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.zone_name} (Base: GH₵{zone.base_fee})
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.deliveryZone && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.deliveryZone}</p>}
                </div>

                {/* Delivery Address - Direct Entry */}
                <div className="space-y-2">
                  <Label>Delivery Address <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter full address (e.g., House No. 15, Spintex Road, Accra)" 
                      value={deliveryAddress} 
                      onChange={(e) => { setDeliveryAddress(e.target.value); setErrors(prev => ({...prev, deliveryAddress: ''})); }} 
                      className={`pl-10 ${errors.deliveryAddress ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.deliveryAddress && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.deliveryAddress}</p>}
                </div>

                {/* Landmark */}
                <div className="space-y-2">
                  <Label>Nearest Landmark (Optional)</Label>
                  <Input 
                    placeholder="e.g., Near Shell Fuel Station, Opposite Market..." 
                    value={deliveryLandmark} 
                    onChange={(e) => setDeliveryLandmark(e.target.value)} 
                  />
                </div>

                {/* Distance Input - REQUIRED */}
                <div className="space-y-2">
                  <Label>Distance from Warehouse (km) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      min="0"
                      step="0.5"
                      placeholder="Enter distance (e.g., 15)" 
                      value={deliveryDistance} 
                      onChange={(e) => { setDeliveryDistance(e.target.value); setErrors(prev => ({...prev, deliveryDistance: ''})); }} 
                      className={errors.deliveryDistance ? "border-destructive" : ""}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Estimated distance from Ghana warehouse to your location</p>
                  {errors.deliveryDistance && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.deliveryDistance}</p>}
                </div>

                {/* Delivery Fee Breakdown - Always visible when zone selected */}
                <div className={`p-3 rounded-lg space-y-2 ${selectedZone ? 'bg-primary/10 border border-primary/30' : 'bg-muted'}`}>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Truck className="w-4 h-4 text-primary" />
                    Delivery Fee Calculation
                  </div>
                  {selectedZone ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Zone Base Fee ({selectedZone.zone_name}):</span>
                        <span>GH₵{zoneBasedFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Distance Fee ({distanceKm || 0}km × GH₵5/km):</span>
                        <span>GH₵{distanceBasedFee.toFixed(2)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold text-primary">
                        <span>Total Delivery Fee:</span>
                        <span>GH₵{deliveryFee.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a zone to see delivery fee</p>
                  )}
                </div>
              </div>
            )}

            {/* Third Party Options */}
            {fulfillmentType === "third_party_pickup" && (
              <div className="space-y-3 p-4 bg-warning/10 rounded-lg border border-warning/30">
                <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4" />Third Party Details</h4>
                <div className="space-y-2">
                  <Label>Name of Person <span className="text-destructive">*</span></Label>
                  <Input placeholder="Enter full name" value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} className={errors.thirdPartyName ? "border-destructive" : ""} />
                  {errors.thirdPartyName && <p className="text-sm text-destructive">{errors.thirdPartyName}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone Number (Optional)</Label>
                  <Input placeholder="+233 XX XXX XXXX" value={thirdPartyPhone} onChange={(e) => setThirdPartyPhone(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">The person named above will need to present valid ID.</p>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!fulfillmentType || isProcessing}
              onClick={handleProceedToPayment}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Continue to Hubtel Payment
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: Processing */}
        {(step === "processing" || step === "checking") && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">
              {step === "processing" ? "Creating your invoice..." : "Verifying payment status..."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait a moment
            </p>
          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice:</span>
                <span className="font-mono font-medium">{invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-bold text-primary">${totalWithDelivery.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center space-y-3">
              <CreditCard className="w-8 h-8 mx-auto text-primary" />
              <div>
                <p className="font-medium">Complete Your Payment</p>
                <p className="text-sm text-muted-foreground">Click below to pay securely via Hubtel</p>
              </div>
              <Button onClick={handleOpenCheckout} className="w-full" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay with Hubtel
              </Button>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">After completing payment:</p>
                  <p className="text-xs text-muted-foreground">Click the button below to verify your payment status</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCheckPaymentStatus} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Payment Status
            </Button>

            <Separator />

            <p className="text-xs text-center text-muted-foreground">
              Payment is verified automatically via Hubtel. Manual payment approval is disabled for security.
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <p className="text-lg font-medium">Payment Verified!</p>
              <p className="text-muted-foreground text-sm">
                Your payment has been confirmed
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-medium">{invoiceNumber}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopy(invoiceNumber, "Invoice number")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tracking Number</p>
                  <p className="font-mono font-medium">{trackingNumber}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopy(trackingNumber, "Tracking number")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Fulfillment</p>
                  <Badge variant="outline">{fulfillmentType?.replace("_", " ").toUpperCase()}</Badge>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  <Badge className="bg-success text-white">PAID ✓</Badge>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-bold text-lg text-primary">
                  ${totalWithDelivery.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleWhatsAppShare}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Share on WhatsApp
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
