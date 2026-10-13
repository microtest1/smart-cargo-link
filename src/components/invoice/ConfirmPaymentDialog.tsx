import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Wallet,
} from "lucide-react";
import type { Invoice } from "@/hooks/useInvoices";

interface ConfirmPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: (Invoice & { amount_paid?: number }) | null;
}

type PayMode = "full" | "partial";
type Step = "select" | "processing" | "payment" | "checking" | "complete";

export function ConfirmPaymentDialog({ open, onOpenChange, invoice }: ConfirmPaymentDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("select");
  const [mode, setMode] = useState<PayMode>("full");
  const [customAmount, setCustomAmount] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState("");

  useEffect(() => {
    if (open) {
      setStep("select");
      setMode("full");
      setCustomAmount("");
      setCheckoutUrl("");
      setClientReference("");
      setError(null);
      if (invoice) setInvoiceId(invoice.id);
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.amount_paid || 0);
  const outstanding = Math.max(0, total - paid);

  const validate = (): { ok: boolean; amount: number; msg: string } => {
    if (outstanding <= 0) return { ok: false, amount: 0, msg: "This invoice has no outstanding balance." };
    if (mode === "full") return { ok: true, amount: outstanding, msg: "" };
    const parsed = Number(customAmount);
    if (!customAmount.trim() || Number.isNaN(parsed)) return { ok: false, amount: 0, msg: "Enter a valid amount." };
    if (parsed <= 0) return { ok: false, amount: 0, msg: "Amount must be greater than zero." };
    if (parsed > outstanding + 0.001) return { ok: false, amount: 0, msg: `Amount cannot exceed the outstanding balance (GH₵ ${outstanding.toFixed(2)}).` };
    return { ok: true, amount: parsed, msg: "" };
  };

  const handleProceed = async () => {
    const v = validate();
    if (!v.ok) {
      setError(v.msg);
      return;
    }
    setError(null);
    setStep("processing");

    try {
      const returnUrl = `${window.location.origin}/invoices?payment=success&invoice=${invoice.id}`;
      const cancellationUrl = `${window.location.origin}/invoices?payment=cancelled&invoice=${invoice.id}`;

      const { data, error } = await supabase.functions.invoke("hubtel-checkout", {
        body: {
          invoiceId: invoice.id,
          amount: v.amount,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          customerPhone: profile?.phone || "",
          customerEmail: profile?.email || "",
          customerName: profile?.full_name || "",
          returnUrl,
          cancellationUrl,
        },
      });

      if (error) throw new Error(error.message || "Failed to start payment");
      if (!data?.success || !data?.checkoutUrl) throw new Error(data?.error || "No checkout URL returned");

      setCheckoutUrl(data.checkoutUrl);
      setClientReference(data.clientReference);
      setStep("payment");
    } catch (e: any) {
      setError(e.message || "Payment could not be started");
      setStep("select");
    }
  };

  const openCheckout = () => {
    if (checkoutUrl) window.open(checkoutUrl, "_blank");
  };

  const checkStatus = async () => {
    setStep("checking");
    try {
      const { data, error } = await supabase.functions.invoke("hubtel-status", {
        body: { invoiceId, clientReference },
      });
      if (error) throw new Error(error.message);
      if (data?.status === "verified") {
        setStep("complete");
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
        toast({ title: "Payment Confirmed ✅", description: "Your invoice has been updated." });
      } else if (data?.status === "rejected") {
        setStep("payment");
        toast({ title: "Payment Failed", description: "Please try again.", variant: "destructive" });
      } else {
        setStep("payment");
        toast({ title: "Payment Pending", description: "Complete payment then check again." });
      }
    } catch (e: any) {
      setStep("payment");
      toast({ title: "Status check failed", description: e.message, variant: "destructive" });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const amountForDisplay = mode === "full" ? outstanding : Number(customAmount || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            Pay Invoice {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>Choose how you'd like to pay via Hubtel.</DialogDescription>
        </DialogHeader>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted text-center">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">GH₵ {total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Paid</p>
            <p className="text-sm font-semibold text-emerald-600">GH₵ {paid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Outstanding</p>
            <p className="text-sm font-semibold text-primary">GH₵ {outstanding.toFixed(2)}</p>
          </div>
        </div>

        {step === "select" && (
          <div className="space-y-4">
            <RadioGroup value={mode} onValueChange={(v) => { setMode(v as PayMode); setError(null); }} className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${mode === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <RadioGroupItem value="full" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-medium">Pay Full Amount</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay the entire outstanding shipping fee (GH₵ {outstanding.toFixed(2)}).
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${mode === "partial" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <RadioGroupItem value="partial" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="font-medium">Pay My Own Amount</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make a partial payment towards your shipping charges.
                  </p>
                </div>
              </label>
            </RadioGroup>

            {mode === "partial" && (
              <div className="space-y-2">
                <Label htmlFor="customAmount">Amount to Pay (GH₵)</Label>
                <Input
                  id="customAmount"
                  inputMode="decimal"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={outstanding}
                  placeholder={`Up to ${outstanding.toFixed(2)}`}
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setError(null); }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter any amount from GH₵ 0.01 up to GH₵ {outstanding.toFixed(2)}.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">You'll pay now:</span>
              <span className="font-bold text-primary">GH₵ {(amountForDisplay || 0).toFixed(2)}</span>
            </div>

            <Button className="w-full" onClick={handleProceed} disabled={outstanding <= 0}>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Hubtel Payment
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Hubtel securely prompts for your Mobile Money PIN. We never collect it in this app.
            </p>
          </div>
        )}

        {(step === "processing" || step === "checking") && (
          <div className="py-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
            <p className="font-medium">
              {step === "processing" ? "Preparing your payment..." : "Verifying payment status..."}
            </p>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-3">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center space-y-3">
              <CreditCard className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium">Complete your payment on Hubtel</p>
              <Button onClick={openCheckout} className="w-full" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Hubtel Checkout
              </Button>
            </div>
            <Button onClick={checkStatus} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              I've Paid — Check Status
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Your invoice updates automatically after Hubtel confirms the payment.
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="text-lg font-medium">Payment Recorded</p>
            <p className="text-sm text-muted-foreground">
              Your invoice balance has been updated.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
