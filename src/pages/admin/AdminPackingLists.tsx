import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { PackingListUpload } from "@/components/admin/PackingListUpload";
import { usePackingLists, useSmsBatches, useRetrySmsBlatch, useAdminSettings, useUpdateAdminSetting } from "@/hooks/usePackingLists";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Upload, 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Send,
  Link as LinkIcon,
  Save
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminPackingLists() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const { packingLists, isLoading: listsLoading, refetch: refetchLists } = usePackingLists();
  const { batches, isLoading: batchesLoading, refetch: refetchBatches } = useSmsBatches(selectedListId || undefined);
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const updateSetting = useUpdateAdminSetting();
  const retrySms = useRetrySmsBlatch();

  // Initialize website URL from settings
  const trackingUrlSetting = settings.find(s => s.setting_key === "tracking_website_url");
  if (trackingUrlSetting && !websiteUrl) {
    setWebsiteUrl(trackingUrlSetting.setting_value);
  }

  const handleSaveWebsiteUrl = () => {
    updateSetting.mutate({ key: "tracking_website_url", value: websiteUrl });
  };

  const stats = {
    totalLists: packingLists.length,
    totalItems: packingLists.reduce((sum, l) => sum + l.total_entries, 0),
    processed: packingLists.filter(l => l.status === "processed").length,
    pending: packingLists.filter(l => l.status === "pending").length,
  };

  const selectedBatches = selectedListId ? batches.filter(b => b.packing_list_id === selectedListId) : batches;
  const batchStats = {
    total: selectedBatches.length,
    sent: selectedBatches.filter(b => b.sms_sent).length,
    failed: selectedBatches.filter(b => !b.sms_sent && b.sms_error).length,
    pending: selectedBatches.filter(b => !b.sms_sent && !b.sms_error).length,
  };

  return (
    <AdminLayout title="Packing Lists">
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="lists">
            <Package className="w-4 h-4 mr-2" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS Log
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <PackingListUpload />
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalLists}</p>
                    <p className="text-sm text-muted-foreground">Total Lists</p>
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
                    <p className="text-2xl font-bold">{stats.totalItems}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
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
                    <p className="text-2xl font-bold">{stats.processed}</p>
                    <p className="text-sm text-muted-foreground">Processed</p>
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
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Packing Lists</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetchLists()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {listsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : packingLists.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No packing lists yet</h3>
                  <p className="text-sm text-muted-foreground">Upload your first packing list to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">CTN</TableHead>
                      <TableHead className="text-right">CBM</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packingLists.map(list => (
                      <TableRow key={list.id}>
                        <TableCell>{format(new Date(list.upload_date), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell>
                          {list.containers?.container_number || list.container_name || "-"}
                          {list.containers?.shipping_container_number && <p className="font-mono text-xs text-muted-foreground">{list.containers.shipping_container_number}</p>}
                        </TableCell>
                        <TableCell className="text-right">{list.total_entries}</TableCell>
                        <TableCell className="text-right">{list.total_cartons}</TableCell>
                        <TableCell className="text-right">{list.total_cbm.toFixed(3)}</TableCell>
                        <TableCell className="text-right">{list.total_weight.toFixed(1)} kg</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            list.status === "processed" 
                              ? "bg-success/10 text-success" 
                              : "bg-warning/10 text-warning"
                          )}>
                            {list.status}
                          </Badge>
                          {list.review_rows > 0 && <p className="mt-1 text-xs text-warning">{list.review_rows} review rows</p>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedListId(list.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View SMS
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Log Tab */}
        <TabsContent value="sms" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batchStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Batches</p>
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
                    <p className="text-2xl font-bold">{batchStats.sent}</p>
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
                    <p className="text-2xl font-bold">{batchStats.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
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
                    <p className="text-2xl font-bold">{batchStats.pending}</p>
                    <p className="text-sm text-muted-foreground">No Phone</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SMS Batches</CardTitle>
                <CardDescription>
                  {selectedListId ? "Showing SMS for selected packing list" : "Showing all SMS batches"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedListId && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedListId(null)}>
                    Show All
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => refetchBatches()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : selectedBatches.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No SMS batches</h3>
                  <p className="text-sm text-muted-foreground">SMS logs will appear here after processing packing lists</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">CBM</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatches.map(batch => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{batch.customer_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{batch.customer_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{batch.customer_phone || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={batch.product_summary}>
                          {batch.product_summary}
                        </TableCell>
                        <TableCell className="text-right">{batch.total_quantity}</TableCell>
                        <TableCell className="text-right">{batch.total_cbm.toFixed(3)}</TableCell>
                        <TableCell>
                          {batch.sms_sent ? (
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          ) : batch.sms_error ? (
                            <div>
                              <Badge className="bg-destructive/10 text-destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                              <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={batch.sms_error}>
                                {batch.sms_error}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              No Phone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.sms_sent_at 
                            ? format(new Date(batch.sms_sent_at), "MMM d, HH:mm")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {!batch.sms_sent && batch.customer_phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retrySms.mutate(batch.id)}
                              disabled={retrySms.isPending}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {batch.sms_error ? "Retry" : "Send"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                SMS Configuration
              </CardTitle>
              <CardDescription>
                Configure the website URL included in SMS messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="https://your-tracking-website.com/track"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This URL will be included in SMS messages for customers to track their shipments
                  </p>
                </div>
                <Button onClick={handleSaveWebsiteUrl} disabled={updateSetting.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>

              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-2">SMS Template Preview</h4>
                <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
{`Hello {Customer Name},

Your goods have been successfully packed at our China warehouse.

Product(s): {Product Summary}
Total Quantity: {Total Quantity}
CBM: {Total CBM}
Weight: {Total Weight} KG

Track your shipment: ${websiteUrl || "{WEBSITE LINK}"}

Thank you,
Amoliga Elite Freight & Logistics`}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
