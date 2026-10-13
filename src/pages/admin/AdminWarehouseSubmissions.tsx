import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { useWarehouseSubmissions, useUpdateSubmissionStatus, useResendSMS } from "@/hooks/useWarehouseSubmissions";
import { useContainers } from "@/hooks/useContainers";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, RefreshCw, MessageSquare, CheckCircle, XCircle, Filter, ExternalLink, AlertTriangle, RotateCcw, Activity } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  received: "bg-cargo-blue/10 text-cargo-blue",
  packed: "bg-blue-500/10 text-blue-600",
  processing: "bg-warning/10 text-warning",
  left_china: "bg-purple-500/10 text-purple-600",
  in_transit: "bg-cargo-teal/10 text-cargo-teal",
  shipped: "bg-cargo-teal/10 text-cargo-teal",
  arrived: "bg-success/10 text-success",
  delivered: "bg-success/10 text-success",
};

export default function AdminWarehouseSubmissions() {
  const [searchTracking, setSearchTracking] = useState("");
  const [searchCustomerCode, setSearchCustomerCode] = useState("");
  const [filterContainer, setFilterContainer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSmsStatus, setFilterSmsStatus] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const { submissions, isLoading, refetch } = useWarehouseSubmissions({
    containerId: filterContainer || undefined,
    trackingNumber: searchTracking || undefined,
    status: filterStatus || undefined,
    userCode: searchCustomerCode || undefined,
  });

  const { containers } = useContainers();
  const updateStatus = useUpdateSubmissionStatus();
  const resendSMS = useResendSMS();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleResendSMS = (submission: any) => {
    resendSMS.mutate(submission);
  };

  const handleRetryAllFailed = async () => {
    setIsRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("retry-failed-sms");
      if (error) throw error;
      toast({
        title: "Retry completed",
        description: `Processed: ${data.processed || 0}, Success: ${data.results?.success || 0}, Failed: ${data.results?.failed || 0}`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Filter by SMS status
  const filteredSubmissions = submissions.filter((s) => {
    if (!filterSmsStatus) return true;
    if (filterSmsStatus === "sent") return s.sms_sent;
    if (filterSmsStatus === "failed") return !s.sms_sent && s.sms_error;
    if (filterSmsStatus === "pending") return !s.sms_sent && !s.sms_error;
    return true;
  });

  const stats = {
    total: submissions.length,
    received: submissions.filter((s) => s.status === "received").length,
    smsSent: submissions.filter((s) => s.sms_sent).length,
    smsFailed: submissions.filter((s) => !s.sms_sent && s.sms_error).length,
    smsPending: submissions.filter((s) => !s.sms_sent && !s.sms_error).length,
  };

  return (
    <AdminLayout title="Warehouse Submissions">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cargo-blue/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-cargo-blue" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.received}</p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.smsSent}</p>
                  <p className="text-sm text-muted-foreground">SMS Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.smsFailed}</p>
                  <p className="text-sm text-muted-foreground">SMS Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.smsPending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Google Form Link & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="w-5 h-5" />
                Warehouse Submission Form
              </CardTitle>
              <CardDescription>
                Share with warehouse staff in China for order updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSc9UAnrrUKoVHNmnK-GDwBpL24CUiPILBT92e1F46wrN_4UhA/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Form
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5" />
                System Controls
              </CardTitle>
              <CardDescription>
                Manage automated processes and retries
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleRetryAllFailed}
                disabled={isRetrying || stats.smsFailed === 0}
              >
                <RotateCcw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
                Retry All Failed SMS ({stats.smsFailed})
              </Button>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className={cn("w-4 h-4 mr-2", autoRefresh && "animate-pulse")} />
                Auto-Refresh: {autoRefresh ? "ON" : "OFF"}
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tracking..."
                  value={searchTracking}
                  onChange={(e) => setSearchTracking(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Customer code..."
                  value={searchCustomerCode}
                  onChange={(e) => setSearchCustomerCode(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterContainer} onValueChange={setFilterContainer}>
                <SelectTrigger>
                  <SelectValue placeholder="All Containers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Containers</SelectItem>
                  {containers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.container_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="left_china">Left China</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSmsStatus} onValueChange={setFilterSmsStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All SMS Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All SMS Status</SelectItem>
                  <SelectItem value="sent">SMS Sent</SelectItem>
                  <SelectItem value="failed">SMS Failed</SelectItem>
                  <SelectItem value="pending">SMS Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTracking("");
                  setSearchCustomerCode("");
                  setFilterContainer("");
                  setFilterStatus("");
                  setFilterSmsStatus("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">No submissions found</h3>
                <p className="text-sm text-muted-foreground">
                  Warehouse submissions will appear here when the form is submitted.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SMS</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-sm">
                          {sub.tracking_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.product_name}</p>
                            {sub.product_details && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {sub.product_details}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.containers?.container_number || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {sub.customer_user_code ? (
                            sub.customer_user_code
                          ) : (
                            <Badge className="bg-warning/10 text-warning text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Unmatched
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{sub.quantity_received}</TableCell>
                        <TableCell>
                          {format(new Date(sub.fulfillment_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.status}
                            onValueChange={(v) => handleStatusChange(sub.id, v)}
                          >
                            <SelectTrigger className="w-28">
                              <Badge className={cn("text-xs", statusColors[sub.status] || "")}>
                                {sub.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="received">Received</SelectItem>
                              <SelectItem value="packed">Packed</SelectItem>
                              <SelectItem value="left_china">Left China</SelectItem>
                              <SelectItem value="in_transit">In Transit</SelectItem>
                              <SelectItem value="arrived">Arrived</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {sub.sms_sent ? (
                              <Badge className="bg-success/10 text-success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sent
                              </Badge>
                            ) : sub.sms_error ? (
                              <div>
                                <Badge className="bg-destructive/10 text-destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                                <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={sub.sms_error}>
                                  {sub.sms_error}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!sub.sms_sent && sub.customer_user_code && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendSMS(sub)}
                              disabled={resendSMS.isPending}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {sub.sms_error ? "Retry" : "Send"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
