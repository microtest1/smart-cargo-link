import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Package, Calculator, Loader2, CheckCircle, Search, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

const manualEntrySchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().optional(),
  uniqueTrackingCode: z.string().min(3, "Tracking code is required"),
  productName: z.string().min(2, "Product name is required"),
  containerName: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  lengthCm: z.coerce.number().min(0).optional(),
  widthCm: z.coerce.number().min(0).optional(),
  heightCm: z.coerce.number().min(0).optional(),
  status: z.string().default("received"),
  notes: z.string().optional(),
});

type ManualEntryForm = z.infer<typeof manualEntrySchema>;

export default function AdminManualEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<ManualEntryForm>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      customerName: "",
      phone: "",
      uniqueTrackingCode: "",
      productName: "",
      containerName: "",
      quantity: 1,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      status: "received",
      notes: "",
    },
  });

  const { pricing } = useCbmPricing();
  const lengthCm = form.watch("lengthCm") || 0;
  const widthCm = form.watch("widthCm") || 0;
  const heightCm = form.watch("heightCm") || 0;

  // Calculate CBM and cost
  const cbm = (lengthCm * widthCm * heightCm) / 1000000;
  const cbmCost = freightForCbm(cbm, pricing);

  // Fetch containers for dropdown
  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("containers")
        .select("id, container_number")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch recent manual entries
  const { data: recentEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ["manual-entries", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("warehouse_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchQuery) {
        const sanitizedSearch = searchQuery.replace(/[",\\()]/g, "").substring(0, 100);
        query = query.or(`customer_name.ilike.%${sanitizedSearch}%,tracking_number.ilike.%${sanitizedSearch}%,customer_user_code.ilike.%${sanitizedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (data: ManualEntryForm) => {
      // Source-of-truth tracking code from the entered sheet value

      // Look up container ID if container name provided
      let containerId = null;
      if (data.containerName) {
        const { data: container } = await supabase
          .from("containers")
          .select("id")
          .or(`container_number.eq.${data.containerName.replace(/[",\\()]/g, "")},id.eq.${data.containerName.replace(/[",\\()]/g, "")}`)
          .maybeSingle();
        containerId = container?.id || null;
      }

      const trackingCodeFromSheet = data.uniqueTrackingCode.trim();

      // Insert warehouse submission
      const { data: submission, error } = await supabase
        .from("warehouse_submissions")
        .insert({
          tracking_number: trackingCodeFromSheet,
          product_name: data.productName,
          customer_name: data.customerName,
          customer_user_code: trackingCodeFromSheet || null,
          container_name: data.containerName || null,
          container_id: containerId,
          quantity_received: data.quantity,
          length_cm: data.lengthCm || 0,
          width_cm: data.widthCm || 0,
          height_cm: data.heightCm || 0,
          status: data.status,
          notes: data.notes || null,
          visible_to_customer: true,
          fulfillment_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Automatic SMS trigger for new received/packed records
      const shouldSendSms = ["received", "packed"].includes(data.status);
      if (shouldSendSms) {
        const rawPhone = data.phone?.trim();
        if (!trackingCodeFromSheet) {
          await supabase
            .from("warehouse_submissions")
            .update({ sms_sent: false, sms_error: "Missing tracking/customer code from sheet" })
            .eq("id", submission.id);
        } else if (!rawPhone) {
          await supabase
            .from("warehouse_submissions")
            .update({ sms_sent: false, sms_error: "No phone number provided" })
            .eq("id", submission.id);
        } else {
          const smsMessage = `Hello ${data.customerName}, your goods have been received and packed at our China warehouse.\n\nTrack your shipment using code: ${trackingCodeFromSheet}\n\nVisit: www.amoligaelitegroupltd.com\n\nAmoliga Elite Freight & Logistics`;

          const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms-notification", {
            body: {
              to: rawPhone,
              message: smsMessage,
              type: "general",
            },
          });

          if (smsError || smsResult?.error) {
            await supabase
              .from("warehouse_submissions")
              .update({
                sms_sent: false,
                sms_error: smsError?.message || smsResult?.error || "SMS sending failed",
              })
              .eq("id", submission.id);
          } else {
            await supabase
              .from("warehouse_submissions")
              .update({
                sms_sent: true,
                sms_sent_at: new Date().toISOString(),
                sms_error: null,
              })
              .eq("id", submission.id);
          }
        }
      }

      return submission;
    },
    onSuccess: () => {
      toast({ title: "Entry created successfully" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["manual-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warehouse_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry deleted" });
      queryClient.invalidateQueries({ queryKey: ["manual-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ManualEntryForm) => {
    createEntry.mutate(data);
  };

  const statusOptions = [
    { value: "received", label: "Received at China Warehouse" },
    { value: "packed", label: "Packed" },
    { value: "left_china", label: "Left China" },
    { value: "in_transit", label: "In Transit" },
    { value: "arrived", label: "Arrived at Ghana" },
  ];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      received: "bg-yellow-500",
      packed: "bg-blue-500",
      left_china: "bg-purple-500",
      in_transit: "bg-cargo-blue",
      arrived: "bg-success",
    };
    return <Badge className={colors[status] || "bg-muted"}>{status}</Badge>;
  };

  return (
    <AdminLayout title="Manual Customer Entry">
      <div className="space-y-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Customer Shipment
            </CardTitle>
            <CardDescription>
              Manually add shipment data for non-registered customers. They can track using the unique code on the public tracking page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="0541234567" {...field} />
                        </FormControl>
                        <FormDescription>Used for automatic SMS notifications</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="uniqueTrackingCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unique Tracking Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="AEF_00001" {...field} />
                        </FormControl>
                        <FormDescription>Customer will use this to track their shipment</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Product Info */}
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Electronics, Clothes, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="containerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Container</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select container" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {containers?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.container_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dimensions */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Dimensions & CBM Calculation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="lengthCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="widthCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heightCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground">CBM</p>
                      <p className="font-bold text-lg">{cbm.toFixed(4)} m³</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                      <p className="text-xs text-muted-foreground">Est. Freight ({formatGhs(pricing.effectiveRate, pricing.currency)}/CBM)</p>
                      <p className="font-bold text-lg text-primary">{formatGhs(cbmCost, pricing.currency)}</p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createEntry.isPending}>
                  {createEntry.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Entry
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Recent Entries
            </CardTitle>
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tracking Code</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>CBM</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEntries?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.customer_name || "-"}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {entry.customer_user_code || entry.tracking_number}
                          </code>
                        </TableCell>
                        <TableCell>{entry.product_name}</TableCell>
                        <TableCell>{entry.quantity_received}</TableCell>
                        <TableCell>{entry.cbm?.toFixed(3) || "-"}</TableCell>
                        <TableCell>{entry.cbm_cost ? formatGhs(entry.cbm_cost, pricing.currency) : "-"}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEntry.mutate(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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
