import { useState } from "react";
import { Truck, MapPin, Loader2, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDeliveryRequest } from "@/hooks/useDeliveryRequests";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequestDeliveryButtonProps {
  shipmentId: string;
  trackingNumber: string;
  productName?: string;
}

export function RequestDeliveryButton({ shipmentId, trackingNumber, productName }: RequestDeliveryButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user, profile } = useAuth();
  const createRequest = useCreateDeliveryRequest();
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!deliveryAddress.trim()) {
      newErrors.deliveryAddress = "Please enter a delivery address";
    }
    if (!amount.trim() || parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid delivery amount";
    }
    if (!customerPhone.trim()) {
      newErrors.customerPhone = "Please enter your phone number for payment";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      // Step 1: Create the delivery request
      const deliveryResult = await createRequest.mutateAsync({
        shipment_id: shipmentId,
        delivery_location_id: null,
        amount: parseFloat(amount),
        payment_status: "pending",
        status: "requested",
        notes: `Delivery Address: ${deliveryAddress}`,
      });

      // Step 2: Initiate Hubtel checkout
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue with payment",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const returnUrl = `${window.location.origin}/shipments?delivery_paid=true`;
      const cancellationUrl = `${window.location.origin}/shipments?delivery_cancelled=true`;

      const response = await supabase.functions.invoke("hubtel-delivery-checkout", {
        body: {
          deliveryRequestId: deliveryResult.id,
          amount: parseFloat(amount),
          description: `Delivery Payment - ${trackingNumber}`,
          customerPhone: customerPhone,
          customerEmail: user?.email,
          customerName: profile?.full_name,
          returnUrl,
          cancellationUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to initiate payment");
      }

      const { checkoutUrl, checkoutDirectUrl } = response.data;
      
      if (checkoutUrl || checkoutDirectUrl) {
        toast({
          title: "Redirecting to Payment",
          description: "You will be redirected to complete your payment...",
        });
        
        // Redirect to Hubtel checkout
        window.location.href = checkoutDirectUrl || checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setOpen(false);
    setAmount("");
    setDeliveryAddress("");
    setCustomerPhone("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button className="w-full gradient-hero">
          <Truck className="w-4 h-4 mr-2" />
          Request Delivery
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Request Delivery
          </DialogTitle>
          <DialogDescription>
            Enter your delivery details and proceed to secure payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Shipment Details</p>
            <p className="text-xs text-muted-foreground">Tracking: {trackingNumber}</p>
            {productName && (
              <p className="text-xs text-muted-foreground line-clamp-2">Product: {productName}</p>
            )}
            <p className="text-xs text-muted-foreground">User Code: {profile?.unique_code}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">
              Delivery Location <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="deliveryAddress"
                placeholder="Enter full delivery address (e.g., House No. 15, Spintex Road, Accra)"
                value={deliveryAddress}
                onChange={(e) => {
                  setDeliveryAddress(e.target.value);
                  if (errors.deliveryAddress) setErrors(prev => ({ ...prev, deliveryAddress: "" }));
                }}
                className={`pl-10 min-h-[80px] ${errors.deliveryAddress ? "border-destructive" : ""}`}
                disabled={isProcessing}
              />
            </div>
            {errors.deliveryAddress && (
              <p className="text-xs text-destructive">{errors.deliveryAddress}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">
              Payment Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customerPhone"
              type="tel"
              placeholder="e.g., 0241234567"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (errors.customerPhone) setErrors(prev => ({ ...prev, customerPhone: "" }));
              }}
              className={errors.customerPhone ? "border-destructive" : ""}
              disabled={isProcessing}
            />
            {errors.customerPhone && (
              <p className="text-xs text-destructive">{errors.customerPhone}</p>
            )}
            <p className="text-xs text-muted-foreground">Mobile money number for payment</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Delivery Amount (GHS) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter amount (e.g., 50)"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
              }}
              className={errors.amount ? "border-destructive" : ""}
              disabled={isProcessing}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          {parseFloat(amount) > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total to Pay:</span>
                <span className="text-lg font-bold text-primary">GHS {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleProceedToPayment} 
            className="w-full"
            disabled={isProcessing || createRequest.isPending}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to Hubtel's secure payment page
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
