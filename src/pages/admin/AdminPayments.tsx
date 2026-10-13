import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdminPaymentConfirmations, useVerifyPayment } from "@/hooks/useAdminPayments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard,
  FileText,
  User,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "verified" | "rejected";

export default function AdminPayments() {
  const { confirmations, isLoading } = useAdminPaymentConfirmations();
  const verifyPayment = useVerifyPayment();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [actionType, setActionType] = useState<"verify" | "reject" | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const filteredConfirmations = confirmations.filter((c) => {
    const matchesSearch =
      c.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.invoices?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = confirmations.filter((c) => c.status === "pending").length;
  const verifiedCount = confirmations.filter((c) => c.status === "verified").length;
  const rejectedCount = confirmations.filter((c) => c.status === "rejected").length;

  const handleAction = async () => {
    if (!selectedPayment || !actionType) return;

    await verifyPayment.mutateAsync({
      confirmationId: selectedPayment.id,
      invoiceId: selectedPayment.invoice_id,
      action: actionType,
      notes: actionNotes,
    });

    setSelectedPayment(null);
    setActionType(null);
    setActionNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "mobile_money":
        return "Mobile Money";
      case "bank_transfer":
        return "Bank Transfer";
      case "cash":
        return "Cash";
      default:
        return method;
    }
  };

  return (
    <AdminLayout title="Payment Verifications">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction ID, user code, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading payments...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredConfirmations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No payment confirmations found
                    </TableCell>
                  </TableRow>
                )}
                {filteredConfirmations.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{payment.user_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* CONTAINER - CRITICAL for filtering by container */}
                      {payment.containers ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {payment.containers.container_number}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-mono text-sm">{payment.invoices?.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.invoices?.shipments?.tracking_number}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">{payment.transaction_id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">GH₵ {payment.amount.toFixed(2)}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      <p className="text-sm">{format(new Date(payment.created_at), "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), "h:mm a")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {payment.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType("verify");
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType("reject");
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* View/Action Dialog */}
      <Dialog
        open={!!selectedPayment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayment(null);
            setActionType(null);
            setActionNotes("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "verify"
                ? "Verify Payment"
                : actionType === "reject"
                ? "Reject Payment"
                : "Payment Details"}
            </DialogTitle>
            {actionType && (
              <DialogDescription>
                {actionType === "verify"
                  ? "Confirm this payment and mark the invoice as paid."
                  : "Reject this payment confirmation."}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedPayment.profiles?.full_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.user_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p className="font-mono font-medium">{selectedPayment.invoices?.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayment.invoices?.shipments?.tracking_number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="font-mono font-medium">{selectedPayment.transaction_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedPayment.payment_method)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Amount</p>
                  <p className="font-semibold text-lg">GH₵ {selectedPayment.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Total</p>
                  <p className="font-semibold text-lg">
                    GH₵ {selectedPayment.invoices?.total_amount?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid To Date</p>
                  <p className="font-semibold text-lg text-emerald-600">
                    GH₵ {Number(selectedPayment.invoices?.amount_paid ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                  <p className="font-semibold text-lg text-amber-600">
                    GH₵ {Math.max(
                      0,
                      Number(selectedPayment.invoices?.total_amount ?? 0) -
                        Number(selectedPayment.invoices?.amount_paid ?? 0),
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Partial payment notice */}
              {selectedPayment.invoices?.status === "partially_paid" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Partial payment</p>
                  <p className="text-xs text-blue-600">
                    This invoice is partially paid. The remaining balance is still due.
                  </p>
                </div>
              )}


              {/* Customer Notes */}
              {selectedPayment.notes && !actionType && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                  <p className="text-sm p-3 bg-muted rounded-lg">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Action Notes */}
              {actionType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder={
                      actionType === "verify"
                        ? "Add any verification notes..."
                        : "Reason for rejection..."
                    }
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Status for non-pending */}
              {!actionType && selectedPayment.status !== "pending" && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedPayment.status)}
                    {selectedPayment.verified_at && (
                      <span className="text-xs text-muted-foreground">
                        on {format(new Date(selectedPayment.verified_at), "MMM d, yyyy h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {actionType ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionType(null);
                    setActionNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={actionType === "verify" ? "default" : "destructive"}
                  onClick={handleAction}
                  disabled={verifyPayment.isPending}
                >
                  {verifyPayment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {actionType === "verify" ? "Verify Payment" : "Reject Payment"}
                </Button>
              </>
            ) : selectedPayment?.status === "pending" ? (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setActionType("reject")}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={() => setActionType("verify")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verify Payment
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
