import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Receipt, Plus, Search, Trash2, Truck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useInvoices, useDeleteInvoice, useDeleteInvoices, type Invoice } from "@/hooks/useInvoices";
import { useDeliveryRequests, useDeleteDeliveryRequest, type DeliveryRequest } from "@/hooks/useDeliveryRequests";
import { InvoiceCard } from "@/components/invoice/InvoiceCard";
import { GenerateInvoiceDialog } from "@/components/invoice/GenerateInvoiceDialog";
import { ConfirmPaymentDialog } from "@/components/invoice/ConfirmPaymentDialog";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [topTab, setTopTab] = useState("invoices");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteDeliveryTarget, setDeleteDeliveryTarget] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { invoices, isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();
  const deleteInvoices = useDeleteInvoices();
  const { requests: deliveryRequests, isLoading: deliveryLoading } = useDeliveryRequests();
  const deleteDeliveryRequest = useDeleteDeliveryRequest();
  
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.shipments?.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.shipments?.product?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      inv.status === activeTab ||
      (activeTab === "pending" && inv.status === "partially_paid");
    return matchesSearch && matchesTab;
  });
  
  const handleConfirmPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };
  
  const handleDownload = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      if (printRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                  @media print { body { padding: 0; } }
                </style>
              </head>
              <body>
                ${printRef.current.innerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    }, 100);
    toast({ title: "Invoice Ready", description: "Print dialog has been opened." });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteInvoice.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteInvoices.mutateAsync(ids);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  const handleDeleteDeliveryConfirm = async () => {
    if (!deleteDeliveryTarget) return;
    await deleteDeliveryRequest.mutateAsync(deleteDeliveryTarget.id);
    setDeleteDeliveryTarget(null);
  };

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  
  const pendingCount = invoices.filter(i => i.status === "pending" || i.status === "partially_paid").length;
  const paidCount = invoices.filter(i => i.status === "paid").length;

  const totalBilled = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaidAmt = invoices.reduce((s, i) => s + Number((i as any).amount_paid || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalPaidAmt);
  const hasPartialHistory = invoices.some(i => Number((i as any).amount_paid || 0) > 0);

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Requested</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case "payment_failed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  return (
    <AppLayout title="Invoices & Requests">
      <div className="px-4 py-5 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">Invoices & Requests</h1>
            <p className="text-muted-foreground text-sm">
              Manage your invoices and delivery requests
            </p>
          </div>
          {topTab === "invoices" && (
            <Button onClick={() => setGenerateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          )}
        </div>

        {/* Top-level tabs */}
        <Tabs value={topTab} onValueChange={setTopTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="invoices" className="text-xs flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              Delivery Requests ({deliveryRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="mt-4 space-y-5">
            {/* Payment Balance Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold">GH₵ {totalBilled.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Shipping Fee</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-emerald-600">GH₵ {totalPaidAmt.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/10">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">GH₵ {totalOutstanding.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment History (partial payments) */}
            {hasPartialHistory && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Payment History</h3>
                  <div className="space-y-2">
                    {invoices
                      .filter(i => Number((i as any).amount_paid || 0) > 0)
                      .map(i => {
                        const total = Number(i.total_amount || 0);
                        const paid = Number((i as any).amount_paid || 0);
                        const due = Math.max(0, total - paid);
                        return (
                          <div key={i.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{i.invoice_number}</p>
                              <p className="text-muted-foreground">
                                Paid GH₵ {paid.toFixed(2)} of GH₵ {total.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={due > 0 ? "text-primary font-semibold" : "text-emerald-600 font-semibold"}>
                                {due > 0 ? `Due GH₵ ${due.toFixed(2)}` : "Cleared"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Counts */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{invoices.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Search + Bulk Actions */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice #, tracking #, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete Selected ({selectedIds.size})
                </Button>
              )}
            </div>
            
            {/* Invoice Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">Paid</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : filteredInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {filteredInvoices.map((invoice) => (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        onConfirmPayment={() => handleConfirmPayment(invoice)}
                        onDownload={() => handleDownload(invoice)}
                        onDelete={() => setDeleteTarget(invoice)}
                        selectable
                        selected={selectedIds.has(invoice.id)}
                        onSelectionChange={(checked) => toggleSelection(invoice.id, checked)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Receipt className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium mb-1">No invoices found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery 
                        ? "Try a different search term" 
                        : "Generate an invoice for your arrived shipments"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setGenerateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Generate Invoice
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DELIVERY REQUESTS TAB */}
          <TabsContent value="delivery" className="mt-4">
            {deliveryLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : deliveryRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No delivery requests</p>
                <p className="text-sm text-muted-foreground">
                  Request delivery from your container tracking view
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveryRequests.map((req: any) => (
                  <Card key={req.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Truck className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">Delivery Request</span>
                            {getDeliveryStatusBadge(req.status)}
                          </div>
                          {req.shipments && (
                            <p className="text-xs text-muted-foreground">
                              {req.shipments.product} · {req.shipments.tracking_number}
                            </p>
                          )}
                          {req.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{req.notes}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{format(new Date(req.created_at), "MMM d, yyyy")}</span>
                            <span>·</span>
                            <Badge variant="secondary" className="text-[10px]">
                              Payment: {req.payment_status}
                            </Badge>
                          </div>
                        </div>
                        {req.amount && (
                          <p className="text-lg font-bold">GH₵ {Number(req.amount).toFixed(2)}</p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => setDeleteDeliveryTarget(req)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      <GenerateInvoiceDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
      
      <ConfirmPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
      />
      
      {/* Single Invoice Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Invoice <strong>{deleteTarget?.invoice_number}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Invoice Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} invoice(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete multiple invoices. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Selected Invoices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Request Delete Confirmation */}
      <AlertDialog open={!!deleteDeliveryTarget} onOpenChange={(open) => !open && setDeleteDeliveryTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this delivery request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The delivery request will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeliveryConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Hidden print view */}
      <div className="hidden">
        {selectedInvoice && (
          <InvoicePrintView
            ref={printRef}
            invoice={selectedInvoice}
            companyName={selectedInvoice.shipments?.companies?.name}
          />
        )}
      </div>
    </AppLayout>
  );
}
