import { useRef, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Receipt,
  Download,
  CreditCard,
  Clock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Copy,
  MessageCircle,
  Loader2,
} from "lucide-react";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

interface InvoiceItem {
  name: string;
  nameChinese?: string;
  quantity: number;
  cartons: number;
  weight: number;
  cbm: number;
}

export interface InvoiceResultData {
  invoiceId: string;
  invoiceNumber: string;
  trackingNumber: string;
  shipmentId: string;
  containerName: string;
  items: InvoiceItem[];
  totalCbm: number;
  totalWeight: number;
  totalCartons: number;
  goodsCost: number;
  totalAmount: number;
  createdAt: Date;
}

interface InvoiceResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InvoiceResultData | null;
}

export function InvoiceResultDialog({ open, onOpenChange, data }: InvoiceResultDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"options" | "payment" | "checking" | "complete">("options");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { pricing } = useCbmPricing();
  if (!data) return null;

  const pricePerCbm = pricing.effectiveRate;

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${data.invoiceNumber}</title>
            <style>
              body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #1a1a1a; }
              @media print { body { padding: 0; } @page { margin: 1cm; } }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
              th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .logo { height: 48px; margin-bottom: 4px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 24px; }
              .totals-box { width: 300px; margin-left: auto; }
              .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
              .totals-final { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1a1a1a; margin-top: 8px; font-size: 18px; font-weight: bold; }
              .summary-box { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
              .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }
              .summary-value { font-size: 22px; font-weight: bold; }
              .summary-label { font-size: 11px; color: #6b7280; }
              .status-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 20px; border-radius: 9999px; font-weight: 600; font-size: 13px; }
              .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 13px; margin-top: 32px; }
            </style>
          </head>
          <body>${printRef.current.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    toast({ title: "PDF Ready", description: "Print dialog opened. Save as PDF to download." });
  };

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Authentication required");

      const returnUrl = `${window.location.origin}/invoices?payment=success&invoice=${data.invoiceId}`;
      const cancellationUrl = `${window.location.origin}/invoices?payment=cancelled&invoice=${data.invoiceId}`;

      const response = await supabase.functions.invoke("hubtel-checkout", {
        body: {
          invoiceId: data.invoiceId,
          amount: data.totalAmount,
          description: `Payment for Invoice ${data.invoiceNumber} - Amoliga Elite Freight`,
          customerPhone: profile?.phone || "",
          customerEmail: profile?.email || "",
          customerName: profile?.full_name || "",
          returnUrl,
          cancellationUrl,
        },
      });

      if (response.error) throw new Error(response.error.message || "Failed to initialize payment");
      const hubtelData = response.data;
      if (!hubtelData.success || !hubtelData.checkoutUrl) throw new Error(hubtelData.error || "Failed to get checkout URL");

      setCheckoutUrl(hubtelData.checkoutUrl);
      setClientReference(hubtelData.clientReference);
      setStep("payment");
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckStatus = async () => {
    setStep("checking");
    try {
      const response = await supabase.functions.invoke("hubtel-status", {
        body: { invoiceId: data.invoiceId, clientReference },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data.status === "verified") {
        setStep("complete");
        toast({ title: "Payment Confirmed! ✅", description: "Your payment has been verified." });
      } else {
        setStep("payment");
        toast({ title: "Payment Pending", description: "Please complete or wait for payment processing." });
      }
    } catch {
      setStep("payment");
      toast({ title: "Status Check Failed", description: "Could not verify. Try again.", variant: "destructive" });
    }
  };

  const handlePayLater = () => {
    toast({ title: "Invoice Saved", description: `Invoice ${data.invoiceNumber} saved. You can pay later from My Shipments → Pending Invoices.` });
    handleClose();
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied.` });
  };

  const handleWhatsAppShare = () => {
    const msg = encodeURIComponent(
      `Hello Amoliga Elite!\n\nInvoice: ${data.invoiceNumber}\nTracking: ${data.trackingNumber}\nContainer: ${data.containerName}\nTotal CBM: ${data.totalCbm.toFixed(4)}\nAmount: ${formatGhs(data.totalAmount, pricing.currency)}\nStatus: Pending Payment\n\nPlease confirm.`
    );
    window.open(`https://wa.me/233208878817?text=${msg}`, "_blank");
  };

  const handleClose = () => {
    setStep("options");
    setCheckoutUrl("");
    setClientReference("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {step === "complete" ? "Payment Confirmed!" : step === "payment" ? "Complete Payment" : "Invoice Generated"}
          </DialogTitle>
          <DialogDescription>
            {step === "options" && "Your shipment invoice has been created. Choose an option below."}
            {step === "payment" && "Complete your payment via Hubtel"}
            {step === "checking" && "Verifying payment..."}
            {step === "complete" && "Payment successful. Your shipment payment has been recorded."}
          </DialogDescription>
        </DialogHeader>

        {/* OPTIONS STEP */}
        {step === "options" && (
          <div className="space-y-4">
            {/* Invoice Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice No:</span>
                <span className="font-mono font-bold">{data.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{profile?.unique_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Container:</span>
                <span>{data.containerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{data.items.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total CBM:</span>
                <span className="font-bold text-primary">{data.totalCbm.toFixed(4)} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping Cost:</span>
                <span className="font-bold text-lg text-primary">{formatGhs(data.totalAmount, pricing.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Pending Payment</Badge>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="space-y-2">
              <Button onClick={handleDownloadPDF} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt (PDF)
              </Button>
              <Button onClick={handleProceedToPayment} className="w-full" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                {isProcessing ? "Initializing..." : "Proceed to Payment"}
              </Button>
              <Button onClick={handlePayLater} className="w-full" variant="ghost">
                <Clock className="w-4 h-4 mr-2" />
                Pay Later
              </Button>
            </div>

            <Button onClick={handleWhatsAppShare} variant="outline" className="w-full" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </Button>
          </div>
        )}

        {/* PAYMENT STEP */}
        {step === "payment" && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span>Invoice:</span><span className="font-mono font-medium">{data.invoiceNumber}</span></div>
              <div className="flex justify-between"><span>Amount:</span><span className="font-bold text-primary">{formatGhs(data.totalAmount, pricing.currency)}</span></div>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center space-y-3">
              <CreditCard className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium">Complete Your Payment</p>
              <Button onClick={() => window.open(checkoutUrl, "_blank")} className="w-full" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay with Hubtel
              </Button>
            </div>
            <Button onClick={handleCheckStatus} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Payment Status
            </Button>
          </div>
        )}

        {/* CHECKING STEP */}
        {step === "checking" && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Verifying payment status...</p>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === "complete" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-lg font-bold">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">Your shipment payment has been recorded.</p>
            </div>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">Invoice</p><p className="font-mono font-bold">{data.invoiceNumber}</p></div>
                <Button size="icon" variant="ghost" onClick={() => handleCopy(data.invoiceNumber, "Invoice")}><Copy className="w-4 h-4" /></Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">Tracking</p><p className="font-mono font-bold">{data.trackingNumber}</p></div>
                <Button size="icon" variant="ghost" onClick={() => handleCopy(data.trackingNumber, "Tracking")}><Copy className="w-4 h-4" /></Button>
              </div>
              <Separator />
              <div className="flex justify-between"><span>Status:</span><Badge className="bg-green-600 text-white">PAID ✓</Badge></div>
              <div><span className="text-xs text-muted-foreground">Amount:</span><p className="font-bold text-lg text-primary">{formatGhs(data.totalAmount, pricing.currency)}</p></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-2" />Receipt</Button>
              <Button className="flex-1" onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}

        {/* HIDDEN PRINT VIEW */}
        <div className="hidden">
          <div ref={printRef}>
            <div className="header">
              <div>
                <img src={amoligaLogo} alt="Amoliga Logo" className="logo" />
                <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: "4px 0 0 0" }}>Amoliga Elite Freight & Logistics</h1>
                <p style={{ color: "#6b7280", marginTop: "2px", fontSize: "13px" }}>China - Ghana | West Africa Shipping</p>
                <p style={{ color: "#9ca3af", fontSize: "12px" }}>Tel: +233 208 878 817 | WhatsApp: +233 208 878 817</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>SHIPMENT INVOICE</h2>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#7c3aed", marginTop: "4px" }}>{data.invoiceNumber}</p>
                <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}>Date: {format(data.createdAt, "MMMM d, yyyy")}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
              <div>
                <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>Bill To</h3>
                <p style={{ fontWeight: 600, fontSize: "15px" }}>{profile?.full_name}</p>
                <p style={{ color: "#6b7280", fontSize: "13px" }}>Shipping Mark: {profile?.unique_code}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>Shipment Details</h3>
                <p style={{ fontSize: "13px" }}><strong>Tracking:</strong> {data.trackingNumber}</p>
                <p style={{ color: "#6b7280", fontSize: "13px" }}>Container: {data.containerName}</p>
                <p style={{ color: "#6b7280", fontSize: "13px" }}>China (Nansha) → Ghana</p>
              </div>
            </div>

            <table>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px" }}>#</th>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px" }}>Item Description</th>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>Qty</th>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>CTN</th>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>Weight (kg)</th>
                  <th style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "right" }}>CBM</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px" }}>
                      <strong>{item.name}</strong>
                      {item.nameChinese && <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{item.nameChinese}</span>}
                    </td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{item.cartons || "-"}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{item.weight?.toFixed(1) || "-"}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "right", fontWeight: 600 }}>{item.cbm.toFixed(4)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: "#f9fafb", fontWeight: "bold" }}>
                  <td colSpan={2} style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "right" }}>TOTALS:</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{data.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{data.totalCartons}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "center" }}>{data.totalWeight.toFixed(1)}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px", textAlign: "right", color: "#7c3aed" }}>{data.totalCbm.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>

            <div className="totals-box">
              <div className="totals-row">
                <span>Sea Freight ({pricing.baseRate} × {pricing.exchangeRate} = {formatGhs(pricePerCbm, pricing.currency)}/CBM):</span>
                <span style={{ fontWeight: 600 }}>{formatGhs(data.goodsCost, pricing.currency)}</span>
              </div>
              <p style={{ fontSize: "11px", color: "#9ca3af", padding: "4px 0" }}>CBM = W × L × H ÷ 1,000,000</p>
              <div className="totals-final">
                <span>Total Amount:</span>
                <span style={{ color: "#7c3aed" }}>{formatGhs(data.totalAmount, pricing.currency)}</span>
              </div>
            </div>

            <div className="summary-box">
              <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>Shipment Summary</h3>
              <div className="summary-grid">
                <div><p className="summary-value">{data.items.length}</p><p className="summary-label">Items</p></div>
                <div><p className="summary-value">{data.totalCartons}</p><p className="summary-label">Cartons</p></div>
                <div><p className="summary-value">{data.totalWeight.toFixed(1)}</p><p className="summary-label">Weight (kg)</p></div>
                <div><p className="summary-value" style={{ color: "#7c3aed" }}>{data.totalCbm.toFixed(4)}</p><p className="summary-label">Total CBM</p></div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <span className="status-badge">PENDING PAYMENT</span>
            </div>

            <div className="footer">
              <p>Thank you for choosing Amoliga Elite Freight & Logistics!</p>
              <p style={{ marginTop: "4px" }}>WhatsApp: +233 208 878 817 | Email: info@amoligafreight.com</p>
              <p style={{ marginTop: "8px", fontSize: "11px" }}>This invoice was automatically generated. Please keep it for your records.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
