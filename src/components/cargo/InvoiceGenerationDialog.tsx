import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectionData } from "./GoodsSelectionDialog";
import { FulfillmentSelectionDialog } from "./FulfillmentSelectionDialog";
import { ModernInvoicePrintView } from "@/components/invoice/ModernInvoicePrintView";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { generateInvoiceFromSelection } from "@/hooks/useInvoiceGeneration";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";
import {
  Receipt,
  Loader2,
  CheckCircle2,
  Copy,
  MessageCircle,
  Download,
  FileText,
  Calculator,
  Weight,
  Package,
  CreditCard,
  Truck,
  ArrowRight,
} from "lucide-react";

interface InvoiceGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionData: SelectionData | null;
  containerName: string;
  containerId: string;
}

type StepType = "review" | "generating" | "complete" | "payment";

export function InvoiceGenerationDialog({
  open,
  onOpenChange,
  selectionData,
  containerName,
  containerId,
}: InvoiceGenerationDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<StepType>("review");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [createdAt, setCreatedAt] = useState<Date>(new Date());
  const [shipmentId, setShipmentId] = useState<string>("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [showFulfillmentDialog, setShowFulfillmentDialog] = useState(false);
  const [fulfillmentCompleted, setFulfillmentCompleted] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [maxRetries] = useState(3);

  const { pricing } = useCbmPricing();
  if (!selectionData || selectionData.items.length === 0) return null;

  const pricePerCbm = pricing.effectiveRate;
  const goodsCost = freightForCbm(selectionData.totalCbm, pricing);
  const totalWeight = selectionData.items.reduce((sum, si) => sum + (si.item.total_weight || 0), 0);
  const totalCartons = selectionData.items.reduce((sum, si) => sum + (si.item.carton_count || 0), 0);

  // IMPORTANT: invoice totals must be calculated before invoice creation
  const totalWithDelivery = selectionData.totalAmount; // Invoice generation must NOT depend on delivery selection

  const sendInvoiceEmail = async (invNum: string, trackNum: string, paymentUrl?: string) => {
    if (!profile?.email) {
      console.log("No email address available, skipping invoice email");
      return;
    }

    try {
      const itemsPayload = selectionData.items.map((si) => ({
        name: si.item.item_name,
        quantity: si.quantity,
        cbm: si.cbm,
        price: freightForCbm(si.cbm, pricing),
      }));

      await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoiceNumber: invNum,
          trackingNumber: trackNum,
          customerName: profile.full_name,
          customerEmail: profile.email,
          customerCode: profile.unique_code,
          items: itemsPayload,
          totalCbm: selectionData.totalCbm,
          totalWeight,
          goodsCost,
          deliveryFee: 0,
          totalAmount: totalWithDelivery,
          fulfillmentType: null,
          deliveryAddress: null,
          containerName,
          paymentUrl,
        },
      });

      console.log("Invoice email sent successfully");
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      // Don't show error to user - email is secondary
    }
  };

  const handleGenerateInvoice = async () => {
    if (!user || !profile) {
      toast({ title: "Authentication Error", description: "Please log in", variant: "destructive" });
      return;
    }
    if (!containerId) {
      toast({ title: "Container Missing", description: "Invoice cannot be generated without a container", variant: "destructive" });
      return;
    }

    setStep("generating");
    try {
      const result = await generateInvoiceFromSelection({
        userId: user.id,
        profile: {
          full_name: profile.full_name,
          email: profile.email,
          unique_code: profile.unique_code,
        },
        containerId,
        containerName,
        items: selectionData.items,
        totalCbm: selectionData.totalCbm,
      });

      setInvoiceNumber(result.invoiceNumber);
      setTrackingNumber(result.trackingNumber);
      setShipmentId(result.shipmentId);
      setInvoiceId(result.invoiceId);
      setCreatedAt(new Date());

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-selections"] });
      queryClient.invalidateQueries({ queryKey: ["container-items"] });

      toast({ title: "Invoice Generated!", description: `Redirecting to payment...` });
      
      // Send invoice email notification
      const returnUrl = `${window.location.origin}/invoices?invoice=${result.invoiceId}`;
      sendInvoiceEmail(result.invoiceNumber, result.trackingNumber, returnUrl);
      
      // Automatically redirect to Hubtel payment
      await initiateHubtelPayment(result.invoiceId, result.invoiceNumber, result.totalAmount);
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setStep("review");
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getInvokeErrorMessage = (err: any): string => {
    // supabase-js FunctionError often includes context with response details
    const context = err?.context;
    const body = context?.body;

    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        return parsed?.details || parsed?.message || parsed?.error || err?.message || "Payment error";
      } catch {
        return body;
      }
    }

    if (body && typeof body === "object") {
      return body?.details || body?.message || body?.error || err?.message || "Payment error";
    }

    return err?.message || "Payment error";
  };
  
  const initiateHubtelPayment = async (invId: string, invNum: string, amount: number, isManualRetry = false) => {
    setStep("payment");
    setPaymentFailed(false);
    setRetryAttempt(0);
    if (isManualRetry) setIsRetrying(true);
    
    const retries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt < retries; attempt++) {
      setRetryAttempt(attempt);
      
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          console.log(`Payment retry attempt ${attempt + 1}/${retries}, waiting ${delay}ms...`);
          await sleep(delay);
        }

        const returnUrl = `${window.location.origin}/invoices?payment=success&invoice=${invId}`;
        
        const { data, error } = await supabase.functions.invoke("hubtel-checkout", {
          body: {
            invoiceId: invId,
            amount: amount,
            description: `Payment for Invoice ${invNum}`,
            customerPhone: (profile?.phone || "").toString(),
            customerEmail: profile?.email,
            customerName: profile?.full_name,
            returnUrl: returnUrl,
            cancellationUrl: returnUrl,
          },
        });

        if (error) throw error;

        if (data?.checkoutUrl) {
          window.open(data.checkoutUrl, "_blank");
          toast({ 
            title: "Payment Page Opened", 
            description: "Complete your payment in the new tab. This window will show your invoice.",
          });
          setPaymentFailed(false);
          setRetryAttempt(0);
          setStep("complete");
          return; // Success - exit the retry loop
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (error: any) {
        console.error(`Hubtel checkout error (attempt ${attempt + 1}/${retries}):`, error);
        
        // If this was the last attempt, show error and allow manual retry
        if (attempt === retries - 1) {
          setPaymentFailed(true);
          toast({ 
            title: "Payment Redirect Failed", 
            description: getInvokeErrorMessage(error),
            variant: "destructive" 
          });
          setStep("complete");
        }
      }
    }
    
    setIsRetrying(false);
    setRetryAttempt(0);
  };

  const handlePayWithHubtel = async (isRetry = false) => {
    if (!invoiceId || !user) return;
    await initiateHubtelPayment(invoiceId, invoiceNumber, totalWithDelivery, isRetry);
  };

  const handleDownloadPDF = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice ${invoiceNumber}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print { body { padding: 0; } @page { margin: 1cm; } }
              </style>
            </head>
            <body>${printRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
    toast({ title: "PDF Ready", description: "Print dialog opened. Save as PDF to download." });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const handleWhatsAppShare = () => {
    const itemsList = selectionData.items.map((si) => `• ${si.item.item_name} (${si.cbm.toFixed(4)} CBM)`).join("\n");
    const message = encodeURIComponent(
      `Hello Amoliga Elite!\n\nI've generated an invoice for my cargo:\n\n📋 Invoice: ${invoiceNumber}\n📦 Tracking: ${trackingNumber}\n📊 Total CBM: ${selectionData.totalCbm.toFixed(4)}\n⚖️ Total Weight: ${totalWeight.toFixed(1)}kg\n💰 Amount: ${formatGhs(totalWithDelivery, pricing.currency)}\n\nItems:\n${itemsList}\n\nPlease confirm receipt.`
    );
    window.open(`https://wa.me/233208878817?text=${message}`, "_blank");
  };

  const handleClose = () => {
    setStep("review");
    setInvoiceNumber("");
    setTrackingNumber("");
    setShipmentId("");
    setInvoiceId("");
    setShowFulfillmentDialog(false);
    setFulfillmentCompleted(false);
    setPaymentFailed(false);
    setIsRetrying(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {step === "complete" ? "Invoice Generated!" : step === "payment" ? "Processing Payment..." : "Generate Invoice"}
          </DialogTitle>
          <DialogDescription>
            {step === "review" && "Review your selected items"}
            {step === "generating" && "Creating your invoice..."}
            {step === "complete" && "Your invoice is ready"}
            {step === "payment" && "Redirecting to payment..."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Review Step */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectionData.items.length}</p>
                  <p className="text-[10px] text-muted-foreground">Items</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <p className="text-lg font-bold">{totalCartons}</p>
                  <p className="text-[10px] text-muted-foreground">Cartons</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Weight className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{totalWeight.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Weight (kg)</p>
                </div>
                <div className="text-center p-2 bg-primary/10 rounded-lg">
                  <Calculator className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold text-primary">{selectionData.totalCbm.toFixed(4)}</p>
                  <p className="text-[10px] text-muted-foreground">Total CBM</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Selected Items ({selectionData.items.length})
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectionData.items.map((si, idx) => (
                    <div key={si.item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <span className="text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="flex-1 truncate">{si.item.item_name}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px]">{si.item.carton_count || 0} CTN</Badge>
                        <Badge variant="secondary" className="text-[10px]">{si.cbm.toFixed(4)} CBM</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="p-3 bg-primary/5 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sea Freight ({pricing.baseRate} × {pricing.exchangeRate} = {formatGhs(pricePerCbm, pricing.currency)}/CBM):</span>
                  <span>{formatGhs(goodsCost, pricing.currency)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">CBM Formula: Width × Length × Height ÷ 1,000,000</p>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-primary">{formatGhs(selectionData.totalAmount, pricing.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="font-medium">Generating your invoice...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Connecting to Hubtel...</p>
                <p className="text-sm text-muted-foreground">You will be redirected to complete payment</p>
              </div>
              
              {/* Retry Progress Indicator */}
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Connection attempt</span>
                  <span>{retryAttempt + 1} of {maxRetries}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${((retryAttempt + 1) / maxRetries) * 100}%` }}
                  />
                </div>
                {retryAttempt > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Retrying... Please wait
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <p className="text-lg font-medium">Invoice Created!</p>
                <p className="text-muted-foreground text-sm">Your invoice has been saved</p>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Number</p>
                    <p className="font-mono font-medium text-lg">{invoiceNumber}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleCopy(invoiceNumber, "Invoice number")}><Copy className="w-4 h-4" /></Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-medium">{trackingNumber}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleCopy(trackingNumber, "Tracking number")}><Copy className="w-4 h-4" /></Button>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Amount Due</p>
                  <p className="font-bold text-xl text-primary">{formatGhs(totalWithDelivery, pricing.currency)}</p>
                </div>
              </div>

              {/* Primary Pay Now Button - Always visible */}
              <Button 
                className="w-full h-12 text-base"
                size="lg"
                onClick={() => handlePayWithHubtel(false)}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                {isRetrying ? "Connecting..." : "Pay Now with Hubtel"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Secure payment via Mobile Money or Card
              </p>

              {/* Fulfillment Selection - Optional step */}
              {!fulfillmentCompleted && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Optional: Select Delivery Method
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Choose how you'll receive your goods (you can do this later)
                  </p>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFulfillmentDialog(true)}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Select Pickup/Delivery
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Show fulfillment confirmed */}
              {fulfillmentCompleted && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">Fulfillment method selected</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your pickup/delivery preference has been saved.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button variant="outline" onClick={handleWhatsAppShare}><MessageCircle className="w-4 h-4 mr-2" />Share WhatsApp</Button>
              </div>

              {/* Payment Failed Retry Section */}
              {paymentFailed && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-destructive">
                    <CreditCard className="w-4 h-4" />
                    Payment Redirect Failed
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We couldn't connect to the payment gateway. This may be due to a network issue.
                  </p>
                  <Button 
                    className="w-full" 
                    variant="destructive"
                    onClick={() => handlePayWithHubtel(true)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {isRetrying ? "Retrying..." : "Retry Payment"}
                  </Button>
                </div>
              )}

            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {step === "review" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleGenerateInvoice}>
                <Receipt className="w-4 h-4 mr-2" />
                Generate Invoice
              </Button>
            </>
          )}
          {step === "complete" && <Button className="w-full" onClick={handleClose}>Done</Button>}
        </div>

        {/* Hidden Print View */}
        {step === "complete" && (
          <div className="hidden">
            <ModernInvoicePrintView
              ref={printRef}
              invoiceNumber={invoiceNumber}
              trackingNumber={trackingNumber}
              userName={profile?.full_name || "Customer"}
              userCode={profile?.unique_code || ""}
              containerName={containerName}
              selectionData={{
                ...selectionData,
                deliveryZone: null,
                deliveryFee: 0,
                totalAmount: totalWithDelivery,
              }}
              createdAt={createdAt}
              fulfillmentType={null}
              deliveryAddress={null}
              contactPhone={profile?.phone || ""}
            />
          </div>
        )}
      </DialogContent>

      {/* Fulfillment Selection Dialog */}
      <FulfillmentSelectionDialog
        open={showFulfillmentDialog}
        onOpenChange={setShowFulfillmentDialog}
        invoiceId={invoiceId}
        containerId={containerId}
        invoiceNumber={invoiceNumber}
        totalAmount={totalWithDelivery}
        onComplete={() => {
          setFulfillmentCompleted(true);
          toast({
            title: "Fulfillment Saved",
            description: "You can now proceed to payment.",
          });
        }}
      />
    </Dialog>
  );
}
