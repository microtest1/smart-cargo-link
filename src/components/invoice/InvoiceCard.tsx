import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, Download, CreditCard, Package, MapPin, Box, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/hooks/useInvoices";

interface InvoiceCardProps {
  invoice: Invoice;
  onViewDetails?: () => void;
  onConfirmPayment?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (checked: boolean) => void;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500" },
  paid: { label: "Paid", color: "bg-green-500" },
  partially_paid: { label: "Partially Paid", color: "bg-blue-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500" },
};

export function InvoiceCard({ invoice, onViewDetails, onConfirmPayment, onDownload, onDelete, selectable, selected, onSelectionChange }: InvoiceCardProps) {
  const status = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.pending;
  const total = Number(invoice.total_amount || 0);
  const paid = Number((invoice as any).amount_paid || 0);
  const outstanding = Math.max(0, total - paid);
  const hasPartial = paid > 0 && paid < total;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectionChange?.(!!checked)}
                className="mt-1"
              />
            )}
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{invoice.invoice_number}</h3>
                <Badge className={cn("text-white text-xs", status.color)}>
                  {status.label}
                </Badge>
              </div>
              
              {invoice.shipments && (
                <div className="mt-2 space-y-1">
                  {invoice.containers && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Box className="w-3 h-3 text-primary" />
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {invoice.containers.container_number}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Package className="w-3 h-3" />
                    <span className="truncate">{invoice.shipments.product}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {invoice.shipments.origin} → {invoice.shipments.destination}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tracking: {invoice.shipments.tracking_number}
                  </p>
                </div>
              )}
              
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(invoice.created_at), "MMM d, yyyy")}</span>
                {invoice.shipments?.companies?.name && (
                  <>
                    <span>·</span>
                    <span>{invoice.shipments.companies.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold">GH₵ {total.toFixed(2)}</p>
            {hasPartial && (
              <>
                <p className="text-[11px] text-emerald-600">Paid: GH₵ {paid.toFixed(2)}</p>
                <p className="text-[11px] text-primary font-semibold">Due: GH₵ {outstanding.toFixed(2)}</p>
              </>
            )}
            {!hasPartial && invoice.tax_amount > 0 && (
              <p className="text-xs text-muted-foreground">
                (incl. tax: GH₵ {invoice.tax_amount.toFixed(2)})
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          {(invoice.status === "pending" || invoice.status === "partially_paid") && onConfirmPayment && (
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={onConfirmPayment}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              {invoice.status === "partially_paid" ? "Pay Balance" : "Pay Now"}
            </Button>
          )}
          {onDownload && (
            <Button 
              variant="outline" 
              size="sm" 
              className={invoice.status === "pending" && onConfirmPayment ? "" : "flex-1"}
              onClick={onDownload}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
