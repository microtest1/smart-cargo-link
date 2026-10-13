import { useRef } from "react";
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
import { format } from "date-fns";
import {
  Receipt,
  Download,
  FileText,
  Calculator,
  Weight,
  Package,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { ContainerItem } from "@/hooks/useContainerItems";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

interface EstimatedInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: ContainerItem[];
  containerName: string;
  totalCbm: number;
  totalWeight: number;
}

export function EstimatedInvoiceDialog({
  open,
  onOpenChange,
  selectedItems,
  containerName,
  totalCbm,
  totalWeight,
}: EstimatedInvoiceDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  if (!selectedItems.length) return null;

  const { pricing } = useCbmPricing();
  const PRICE_PER_CBM = pricing.effectiveRate;
  const goodsCost = freightForCbm(totalCbm, pricing);
  const totalCartons = selectedItems.reduce((s, i) => s + (i.carton_count || 0), 0);
  const today = new Date();

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Estimated Invoice - ${containerName}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #1a1a1a; }
              @media print { body { padding: 0; } @page { margin: 1cm; } }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
              th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 20px; }
              .header-left h1 { font-size: 24px; margin: 0; }
              .header-right { text-align: right; }
              .estimate-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 9999px; font-weight: 600; font-size: 13px; }
              .totals-box { width: 280px; margin-left: auto; }
              .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .totals-final { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1a1a1a; margin-top: 8px; font-size: 18px; font-weight: bold; }
              .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 13px; margin-top: 32px; }
              .disclaimer { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #1e40af; }
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

  const handleWhatsAppShare = () => {
    const itemsList = selectedItems.map((i) => `• ${i.item_name} (${i.total_cbm.toFixed(2)} CBM)`).join("\n");
    const message = encodeURIComponent(
      `Hello Amoliga Elite!\n\nEstimated CBM Invoice:\n\n📦 Container: ${containerName}\n👤 Customer: ${profile?.full_name}\n🔖 Code: ${profile?.unique_code}\n📊 Total CBM: ${totalCbm.toFixed(3)} m³\n💰 Est. Freight: ${formatGhs(goodsCost, pricing.currency)}\n\nItems:\n${itemsList}\n\nPlease confirm when the container arrives.`
    );
    window.open(`https://wa.me/233208878817?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Estimated Invoice
          </DialogTitle>
          <DialogDescription>
            This is an estimate based on your selected goods. Final charges confirmed on arrival.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-muted rounded-lg">
                <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{selectedItems.length}</p>
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
                <p className="text-lg font-bold text-primary">{totalCbm.toFixed(3)}</p>
                <p className="text-[10px] text-muted-foreground">Total CBM</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-muted-foreground">Code: {profile?.unique_code}</p>
              <p className="text-muted-foreground">Container: {containerName}</p>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Selected Goods ({selectedItems.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                    <span className="text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="flex-1 truncate">{item.item_name}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">{item.carton_count || 0} CTN</Badge>
                      <Badge variant="secondary" className="text-[10px]">{item.total_cbm.toFixed(2)} CBM</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Cost Breakdown */}
            <div className="p-3 bg-primary/5 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Estimated Freight ({pricing.baseRate} × {pricing.exchangeRate} = {formatGhs(PRICE_PER_CBM, pricing.currency)}/CBM):</span>
                <span className="font-semibold">{formatGhs(goodsCost, pricing.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Estimated Total:</span>
                <span className="text-primary">{formatGhs(goodsCost, pricing.currency)}</span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">⚠️ Estimated Invoice</p>
              <p>
                This is an estimated invoice based on the CBM of your selected goods. 
                Final charges will be confirmed when the container arrives at the destination warehouse.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button onClick={handleDownloadPDF} className="w-full" variant="default">
                <Download className="w-4 h-4 mr-2" />
                Download Invoice (PDF)
              </Button>
              <Button onClick={handleWhatsAppShare} variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Share on WhatsApp
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Hidden Print View */}
        <div className="hidden">
          <div ref={printRef}>
            <div className="header">
              <div className="header-left">
                <h1>Amoliga Elite Freight</h1>
                <p style={{ color: "#6b7280", marginTop: "4px" }}>Freight & Logistics Services</p>
                <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "8px" }}>China - Ghana | West Africa Shipping</p>
                <p style={{ color: "#9ca3af", fontSize: "13px" }}>Tel: +233 208 878 817</p>
              </div>
              <div className="header-right">
                <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>ESTIMATED INVOICE</h2>
                <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}>
                  Date: {format(today, "MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>Bill To</h3>
                <p style={{ fontWeight: 600 }}>{profile?.full_name}</p>
                <p style={{ color: "#6b7280" }}>Customer Code: {profile?.unique_code}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>Shipment Details</h3>
                <p>Container: {containerName}</p>
                <p style={{ color: "#6b7280" }}>China (Nansha) → Ghana</p>
              </div>
            </div>

            <div className="disclaimer">
              This is an estimated invoice based on the CBM of your selected goods. Final charges will be confirmed when the container arrives.
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Description</th>
                  <th className="text-center">Cartons</th>
                  <th className="text-center">Weight (kg)</th>
                  <th className="text-right">CBM</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td><strong>{item.item_name}</strong></td>
                    <td className="text-center">{item.carton_count || "-"}</td>
                    <td className="text-center">{item.total_weight?.toFixed(1) || "-"}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>{item.total_cbm.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: "#f9fafb", fontWeight: "bold" }}>
                  <td colSpan={2} className="text-right">TOTALS:</td>
                  <td className="text-center">{totalCartons}</td>
                  <td className="text-center">{totalWeight.toFixed(1)}</td>
                  <td className="text-right" style={{ color: "#9b87f5" }}>{totalCbm.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>

            <div className="totals-box">
              <div className="totals-row">
                <span>Estimated Freight ({pricing.baseRate} × {pricing.exchangeRate} = {formatGhs(PRICE_PER_CBM, pricing.currency)}/CBM):</span>
                <span style={{ fontWeight: 600 }}>{formatGhs(goodsCost, pricing.currency)}</span>
              </div>
              <div className="totals-final">
                <span>Estimated Total:</span>
                <span style={{ color: "#9b87f5" }}>{formatGhs(goodsCost, pricing.currency)}</span>
              </div>
            </div>

            <div style={{ textAlign: "center", margin: "24px 0" }}>
              <span className="estimate-badge">ESTIMATED — PENDING ARRIVAL</span>
            </div>

            <div className="footer">
              <p>Thank you for choosing Amoliga Elite Freight!</p>
              <p style={{ marginTop: "4px" }}>For inquiries, contact us on WhatsApp: +233 208 878 817</p>
              <p style={{ marginTop: "8px", fontSize: "11px" }}>
                This is an estimated invoice. Final charges will be confirmed upon container arrival.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
