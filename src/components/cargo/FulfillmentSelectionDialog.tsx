import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDeliveryZones, calculateDeliveryFee } from "@/hooks/useContainerItems";
import { useDeliveryLocations } from "@/hooks/useDeliveryLocations";
import { useCreateOrderFulfillment, FulfillmentType } from "@/hooks/useOrderFulfillments";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Truck,
  Users,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Home,
  Navigation,
} from "lucide-react";

interface FulfillmentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  containerId: string;
  invoiceNumber: string;
  totalAmount: number;
  onComplete: () => void;
}

const fulfillmentOptions = [
  {
    id: "self_pickup" as FulfillmentType,
    label: "Self Pickup",
    description: "I will personally pick up my goods",
    icon: User,
  },
  {
    id: "delivery" as FulfillmentType,
    label: "Delivery",
    description: "Deliver to my specified location",
    icon: Truck,
  },
  {
    id: "third_party_pickup" as FulfillmentType,
    label: "Third-Party Pickup",
    description: "Someone else will pick up on my behalf",
    icon: Users,
  },
];

export function FulfillmentSelectionDialog({
  open,
  onOpenChange,
  invoiceId,
  containerId,
  invoiceNumber,
  totalAmount,
  onComplete,
}: FulfillmentSelectionDialogProps) {
  const { profile } = useAuth();
  const { ghanaRegions, westAfricanCountries, isLoading: zonesLoading } = useDeliveryZones();
  const { locations } = useDeliveryLocations();
  const createFulfillment = useCreateOrderFulfillment();

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | "">("");
  const [contactPhone, setContactPhone] = useState(profile?.phone || "");
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [thirdPartyPhone, setThirdPartyPhone] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [savedLocationId, setSavedLocationId] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryDistance, setDeliveryDistance] = useState("");
  // Default to manual mode for easier UX - users can switch to saved if they have locations
  const [locationInputMode, setLocationInputMode] = useState<"select" | "manual">("manual");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allZones = [...ghanaRegions, ...westAfricanCountries];
  const selectedZone = allZones.find(z => z.id === deliveryZoneId);
  const selectedSavedLocation = locations.find(loc => loc.id === savedLocationId);
  
  // Distance-based delivery fee calculation
  const distanceKm = parseFloat(deliveryDistance) || 0;
  const distanceBasedFee = distanceKm > 0 ? distanceKm * 5 : 0;
  const zoneBasedFee = selectedZone ? calculateDeliveryFee(selectedZone, 1) : 0; // Base fee for display
  const deliveryFee = zoneBasedFee + distanceBasedFee;
  
  // Get effective delivery address
  const effectiveDeliveryAddress = locationInputMode === "select" && selectedSavedLocation 
    ? selectedSavedLocation.address 
    : customAddress;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fulfillmentType) {
      newErrors.fulfillmentType = "Please select a fulfillment option";
    }
    if (!contactPhone.trim()) {
      newErrors.contactPhone = "Contact phone is required";
    }
    if (fulfillmentType === "delivery") {
      if (!deliveryZoneId) {
        newErrors.deliveryZone = "Please select a delivery zone";
      }
      if (!customAddress.trim()) {
        newErrors.deliveryLocation = "Please enter your delivery address";
      }
      if (!deliveryDistance.trim() || parseFloat(deliveryDistance) <= 0) {
        newErrors.deliveryDistance = "Please enter the distance in kilometers";
      }
    }
    if (fulfillmentType === "third_party_pickup") {
      if (!thirdPartyName.trim()) {
        newErrors.thirdPartyName = "Third party name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!fulfillmentType) return;

    try {
      await createFulfillment.mutateAsync({
        invoice_id: invoiceId,
        container_id: containerId,
        fulfillment_type: fulfillmentType,
        contact_phone: contactPhone,
        third_party_name: fulfillmentType === "third_party_pickup" ? thirdPartyName : undefined,
        third_party_phone: fulfillmentType === "third_party_pickup" ? thirdPartyPhone : undefined,
        delivery_zone_id: fulfillmentType === "delivery" ? deliveryZoneId || undefined : undefined,
        delivery_address: fulfillmentType === "delivery" ? `${customAddress}${deliveryLandmark ? ` (Landmark: ${deliveryLandmark})` : ''} | Distance: ${deliveryDistance}km` : undefined,
        notes: fulfillmentType === "delivery" ? `Distance: ${deliveryDistance}km | Fee: GH₵${deliveryFee.toFixed(2)}` : notes || undefined,
      });
      onComplete();
      handleClose();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    setFulfillmentType("");
    setContactPhone(profile?.phone || "");
    setThirdPartyName("");
    setThirdPartyPhone("");
    setDeliveryZoneId("");
    setSavedLocationId("");
    setCustomAddress("");
    setDeliveryLandmark("");
    setDeliveryDistance("");
    setLocationInputMode("manual");
    setNotes("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            How Will You Receive Your Goods?
          </DialogTitle>
          <DialogDescription>
            Select how you'd like to receive your order for Invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="font-bold text-lg text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Fulfillment Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Fulfillment Method <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={fulfillmentType}
              onValueChange={(value) => {
                setFulfillmentType(value as FulfillmentType);
                setErrors({});
              }}
              className="space-y-2"
            >
              {fulfillmentOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    fulfillmentType === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setFulfillmentType(option.id);
                    setErrors({});
                  }}
                >
                  <RadioGroupItem value={option.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.fulfillmentType && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.fulfillmentType}
              </p>
            )}
          </div>

          <Separator />

          {/* Contact Phone - Always Required */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">
              Contact Phone <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contactPhone"
                placeholder="+233 XX XXX XXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={`pl-10 ${errors.contactPhone ? "border-destructive" : ""}`}
              />
            </div>
            {errors.contactPhone && (
              <p className="text-sm text-destructive">{errors.contactPhone}</p>
            )}
          </div>

          {/* Delivery Options */}
          {fulfillmentType === "delivery" && (
            <div className="space-y-4 p-4 bg-accent/10 rounded-lg border border-accent/30">
              <h4 className="font-medium flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Delivery Details
              </h4>

              {/* Delivery Zone */}
              <div className="space-y-2">
                <Label>Delivery Zone <span className="text-destructive">*</span></Label>
                <Select value={deliveryZoneId} onValueChange={(val) => { setDeliveryZoneId(val); setErrors(prev => ({...prev, deliveryZone: ''})); }}>
                  <SelectTrigger className={errors.deliveryZone ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select your region/country" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                    {zonesLoading ? (
                      <SelectItem value="loading" disabled>Loading zones...</SelectItem>
                    ) : (
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
                  <Textarea
                    placeholder="Enter full address (e.g., House No. 15, Spintex Road, Accra)"
                    value={customAddress}
                    onChange={(e) => { setCustomAddress(e.target.value); setErrors(prev => ({...prev, deliveryLocation: ''})); }}
                    className={`pl-10 min-h-[70px] ${errors.deliveryLocation ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.deliveryLocation && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.deliveryLocation}</p>}
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
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    min="0"
                    step="0.5"
                    placeholder="Enter distance (e.g., 15)" 
                    value={deliveryDistance} 
                    onChange={(e) => { setDeliveryDistance(e.target.value); setErrors(prev => ({...prev, deliveryDistance: ''})); }} 
                    className={`pl-10 ${errors.deliveryDistance ? "border-destructive" : ""}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Estimated distance from Ghana warehouse to your location</p>
                {errors.deliveryDistance && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.deliveryDistance}</p>}
              </div>

              {/* Delivery Fee Breakdown */}
              <div className={`p-3 rounded-lg space-y-2 ${selectedZone ? 'bg-primary/10 border border-primary/30' : 'bg-muted'}`}>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Truck className="w-4 h-4 text-primary" />
                  Delivery Fee Calculation
                </div>
                {selectedZone ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Zone Base Fee ({selectedZone.zone_name}):</span>
                      <span>GH₵{selectedZone.base_fee}</span>
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

          {/* Third Party Pickup Options */}
          {fulfillmentType === "third_party_pickup" && (
            <div className="space-y-4 p-4 bg-warning/10 rounded-lg border border-warning/30">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Third Party Details
              </h4>

              <div className="space-y-2">
                <Label htmlFor="thirdPartyName">
                  Name of Person <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="thirdPartyName"
                  placeholder="Enter full name"
                  value={thirdPartyName}
                  onChange={(e) => setThirdPartyName(e.target.value)}
                  className={errors.thirdPartyName ? "border-destructive" : ""}
                />
                {errors.thirdPartyName && (
                  <p className="text-sm text-destructive">{errors.thirdPartyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="thirdPartyPhone">Phone Number (Optional)</Label>
                <Input
                  id="thirdPartyPhone"
                  placeholder="+233 XX XXX XXXX"
                  value={thirdPartyPhone}
                  onChange={(e) => setThirdPartyPhone(e.target.value)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                The person named above will need to present valid ID when picking up.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!fulfillmentType || createFulfillment.isPending}
          >
            {createFulfillment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirm Fulfillment Method
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
