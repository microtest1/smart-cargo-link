import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Package, Edit2, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStage, mapToStage } from "@/lib/shipmentStages";

function StatusBadge({ status }: { status: string }) {
  const stage = getStage(status);
  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap", stage.color)}>
      {stage.emoji} {stage.label}
    </span>
  );
}

type ShipmentStatus =
  | "received_china"
  | "processing"
  | "in_transit"
  | "arrived_ghana"
  | "ready_collection"
  | "pending"
  | "in-transit"
  | "customs"
  | "arrived"
  | "delivered";

interface ShipmentForm {
  tracking_number: string;
  user_code: string;
  company_id: string;
  product: string;
  weight: string;
  dimensions: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  estimated_delivery: string;
  notes: string;
  container_id: string;
  customer_name: string;
  customer_phone: string;
  customer_location: string;
  service_type: string;
  vehicle_identifier: string;
  vehicle_model: string;
  vehicle_year: string;
}

const initialForm: ShipmentForm = {
  tracking_number: "",
  user_code: "",
  company_id: "",
  product: "",
  weight: "",
  dimensions: "",
  status: "received_china",
  origin: "Guangzhou, China",
  destination: "Accra, Ghana",
  estimated_delivery: "",
  notes: "",
  container_id: "",
  customer_name: "",
  customer_phone: "",
  customer_location: "",
  service_type: "sea_freight",
  vehicle_identifier: "",
  vehicle_model: "",
  vehicle_year: "",
};

export default function AdminShipments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentForm>(initialForm);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, companies(name), containers(container_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("containers")
        .select("id, container_number, status")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["admin-customer-codes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, unique_code")
        .not("unique_code", "is", null)
        .order("unique_code", { ascending: true });
      return data || [];
    },
  });

  // Auto-select the only company so the form is usable without extra clicks
  useEffect(() => {
    if (!form.company_id && companies?.length === 1) {
      setForm((p) => ({ ...p, company_id: companies[0].id }));
    }
  }, [companies, form.company_id]);

  const createMutation = useMutation({
    mutationFn: async (data: ShipmentForm) => {
      if (!data.company_id) {
        throw new Error("Please select a company");
      }
      const userCode = data.user_code.trim().toUpperCase();
      if (!userCode) {
        throw new Error("Please select or enter a customer code");
      }
      if (!data.product.trim()) {
        throw new Error("Please enter a product description");
      }
      if (data.service_type === "vehicle" && (!data.vehicle_identifier.trim() || !data.vehicle_model.trim() || !data.vehicle_year)) {
        throw new Error("Vehicle shipments require chassis/VIN/serial number, model and year");
      }

      // Link the shipment to the customer's account so it shows on their dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("unique_code", userCode)
        .maybeSingle();

      // Use the official tracking number generator when none was typed
      let trackingNumber = data.tracking_number.trim();
      if (!trackingNumber) {
        const { data: generated, error: genError } = await supabase.rpc("generate_tracking_number");
        if (genError || !generated) {
          throw new Error("Could not generate a tracking number. Please enter one manually.");
        }
        trackingNumber = generated as string;
      }

      const { error } = await supabase.from("shipments").insert({
        tracking_number: trackingNumber,
        user_code: userCode,
        user_id: profile?.user_id ?? null,
        company_id: data.company_id,
        product: data.product.trim(),
        weight: data.weight ? parseFloat(data.weight) : null,
        dimensions: data.dimensions || null,
        status: data.status,
        origin: data.origin,
        destination: data.destination,
        estimated_delivery: data.estimated_delivery || null,
        notes: data.notes || null,
        container_id: data.container_id || null,
        customer_name: data.customer_name.trim() || null,
        customer_phone: data.customer_phone.trim() || null,
        customer_location: data.customer_location.trim() || null,
        service_type: data.service_type || null,
        vehicle_identifier: data.service_type === "vehicle" ? data.vehicle_identifier.trim() : null,
        vehicle_model: data.service_type === "vehicle" ? data.vehicle_model.trim() : null,
        vehicle_year: data.service_type === "vehicle" ? Number(data.vehicle_year) : null,
      });
      if (error) {
        if (error.code === "23505" || error.message.includes("duplicate")) {
          throw new Error(`Tracking number ${trackingNumber} already exists`);
        }
        throw error;
      }
      return { trackingNumber, linked: !!profile?.user_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast({
        title: `Shipment ${result.trackingNumber} created`,
        description: result.linked
          ? "Linked to the customer account."
          : "No matching customer account found — it will link once the code exists.",
      });
      setIsDialogOpen(false);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating shipment", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShipmentForm }) => {
      if (!data.company_id) {
        throw new Error("Please select a company");
      }
      if (data.service_type === "vehicle" && (!data.vehicle_identifier.trim() || !data.vehicle_model.trim() || !data.vehicle_year)) {
        throw new Error("Vehicle shipments require chassis/VIN/serial number, model and year");
      }

      const previous = (shipments || []).find((s: any) => s.id === id) as any;
      const stageChanged =
        !previous || mapToStage(previous.status) !== mapToStage(data.status);

      const { error } = await supabase
        .from("shipments")
        .update({
          tracking_number: data.tracking_number,
          user_code: data.user_code,
          company_id: data.company_id,
          product: data.product,
          weight: data.weight ? parseFloat(data.weight) : null,
          dimensions: data.dimensions || null,
          status: data.status,
          origin: data.origin,
          destination: data.destination,
          estimated_delivery: data.estimated_delivery || null,
          notes: data.notes || null,
          container_id: data.container_id || null,
          customer_name: data.customer_name?.trim() || null,
          customer_phone: data.customer_phone?.trim() || null,
          customer_location: data.customer_location?.trim() || null,
          service_type: data.service_type || null,
          vehicle_identifier: data.service_type === "vehicle" ? data.vehicle_identifier.trim() : null,
          vehicle_model: data.service_type === "vehicle" ? data.vehicle_model.trim() : null,
          vehicle_year: data.service_type === "vehicle" ? Number(data.vehicle_year) : null,
        })
        .eq("id", id);
      if (error) throw error;

      // Stage change → SMS + email (in-app notification is created by a DB trigger)
      let notified: { sms?: unknown; email?: unknown } | null = null;
      if (stageChanged) {
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke(
          "notify-shipment-status",
          { body: { shipmentId: id } },
        );
        if (notifyError) {
          console.error("notify-shipment-status failed", notifyError);
        } else {
          notified = notifyData as any;
        }
      }
      return { stageChanged, notified };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Shipment updated successfully",
        description: result?.stageChanged
          ? `Customer notified — SMS: ${result?.notified?.sms ?? "failed"}, Email: ${result?.notified?.email ?? "failed"}`
          : undefined,
      });
      setIsDialogOpen(false);
      setEditingId(null);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating shipment", description: error.message, variant: "destructive" });
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      toast({ title: "Shipment deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting shipment", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (shipment: any) => {
    setEditingId(shipment.id);
    setForm({
      tracking_number: shipment.tracking_number,
      user_code: shipment.user_code,
      company_id: shipment.company_id,
      product: shipment.product,
      weight: shipment.weight?.toString() || "",
      dimensions: shipment.dimensions || "",
      customer_name: shipment.customer_name || "",
      customer_phone: shipment.customer_phone || "",
      customer_location: shipment.customer_location || "",
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimated_delivery: shipment.estimated_delivery || "",
      notes: shipment.notes || "",
      container_id: shipment.container_id || "",
      service_type: shipment.service_type || "sea_freight",
      vehicle_identifier: shipment.vehicle_identifier || "",
      vehicle_model: shipment.vehicle_model || "",
      vehicle_year: shipment.vehicle_year?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const filteredShipments = shipments?.filter(
    (s) =>
      s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateTrackingNumber = async () => {
    const { data, error } = await supabase.rpc("generate_tracking_number");
    if (error || !data) {
      toast({
        title: "Could not generate tracking number",
        description: "Please enter one manually.",
        variant: "destructive",
      });
      return;
    }
    setForm((prev) => ({ ...prev, tracking_number: data as string }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="Shipments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setForm(initialForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="w-4 h-4 mr-2" />
                Add Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Shipment" : "Create New Shipment"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tracking Number</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.tracking_number}
                        onChange={(e) => setForm((p) => ({ ...p, tracking_number: e.target.value }))}
                        placeholder="Auto (TRK-000001)"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={generateTrackingNumber}>
                        Gen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Code *</Label>
                    <Input
                      list="admin-customer-codes"
                      value={form.user_code}
                      onChange={(e) => setForm((p) => ({ ...p, user_code: e.target.value }))}
                      placeholder="AEF_00001"
                      required
                    />
                    <datalist id="admin-customer-codes">
                      {customers?.map((c) => (
                        <option key={c.user_id} value={c.unique_code ?? ""}>
                          {c.full_name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 p-4 space-y-4">
                  <p className="text-sm font-medium">Customer Contact & Location</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={form.customer_name}
                        onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                        placeholder="Kwame Mensah"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Contact</Label>
                      <Input
                        value={form.customer_phone}
                        onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                        placeholder="233241234567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Location / Delivery Address</Label>
                    <Input
                      value={form.customer_location}
                      onChange={(e) => setForm((p) => ({ ...p, customer_location: e.target.value }))}
                      placeholder="East Legon, Accra"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Select
                    value={form.company_id}
                    onValueChange={(value) => setForm((p) => ({ ...p, company_id: value }))}
                    required
                  >
                    <SelectTrigger className={!form.company_id ? "text-muted-foreground" : ""}>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product Description *</Label>
                  <Input
                    value={form.product}
                    onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
                    placeholder="e.g., Electronics, Clothing, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shipping Service *</Label>
                  <Select value={form.service_type} onValueChange={(value) => setForm((p) => ({ ...p, service_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea_freight">Sea Freight</SelectItem>
                      <SelectItem value="vehicle">Car / Vehicle Shipping</SelectItem>
                      <SelectItem value="air_freight">Air Freight</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.service_type === "vehicle" && (
                  <div className="space-y-4 rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-medium">Vehicle Details</p>
                    <div className="space-y-2">
                      <Label>Chassis / VIN / Serial Number *</Label>
                      <Input value={form.vehicle_identifier} onChange={(e) => setForm((p) => ({ ...p, vehicle_identifier: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Model *</Label><Input value={form.vehicle_model} onChange={(e) => setForm((p) => ({ ...p, vehicle_model: e.target.value }))} required /></div>
                      <div className="space-y-2"><Label>Year *</Label><Input type="number" min="1886" max="2200" value={form.vehicle_year} onChange={(e) => setForm((p) => ({ ...p, vehicle_year: e.target.value }))} required /></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dimensions</Label>
                    <Input
                      value={form.dimensions}
                      onChange={(e) => setForm((p) => ({ ...p, dimensions: e.target.value }))}
                      placeholder="L x W x H cm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: ShipmentStatus) => setForm((p) => ({ ...p, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received_china">✅ Goods Received in China</SelectItem>
                        <SelectItem value="processing">📦 Shipment Processing</SelectItem>
                        <SelectItem value="in_transit">🚢 Goods in Transit</SelectItem>
                        <SelectItem value="arrived_ghana">🇬🇭 Arrived in Ghana / Customs</SelectItem>
                        <SelectItem value="ready_collection">📋 Ready for Collection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Container</Label>
                    <Select
                      value={form.container_id || "none"}
                      onValueChange={(value) =>
                        setForm((p) => ({ ...p, container_id: value === "none" ? "" : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select container" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No container</SelectItem>
                        {containers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.container_number} ({c.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origin *</Label>
                    <Input
                      value={form.origin}
                      onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
                      placeholder="Guangzhou, China"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination *</Label>
                    <Input
                      value={form.destination}
                      onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                      placeholder="Accra, Ghana"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={form.estimated_delivery}
                    onChange={(e) => setForm((p) => ({ ...p, estimated_delivery: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" className="flex-1" disabled={isPending}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Update" : "Create"} Shipment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Shipments Table */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Tracking #</th>
                  <th className="text-left p-4 font-medium text-sm">User Code</th>
                  <th className="text-left p-4 font-medium text-sm">Product</th>
                  <th className="text-left p-4 font-medium text-sm">Service / Details</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Container</th>
                  <th className="text-left p-4 font-medium text-sm">Route</th>
                  <th className="text-left p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                )}
                {!isLoading && filteredShipments?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No shipments found
                    </td>
                  </tr>
                )}
                {filteredShipments?.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{shipment.tracking_number}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <p className="font-mono">{shipment.user_code}</p>
                      {(shipment as any).customer_name && (
                        <p className="text-xs">{(shipment as any).customer_name}</p>
                      )}
                      {(shipment as any).customer_phone && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {(shipment as any).customer_phone}
                        </p>
                      )}
                      {(shipment as any).customer_location && (
                        <p className="text-xs text-muted-foreground">
                          {(shipment as any).customer_location}
                        </p>
                      )}
                    </td>
                    <td className="p-4 max-w-[200px] truncate">{shipment.product}</td>
                    <td className="p-4 text-sm">
                      <p className="font-medium">{shipment.service_type === "vehicle" ? "Car / Vehicle" : shipment.service_type === "air_freight" ? "Air Freight" : shipment.service_type === "other" ? "Other" : "Sea Freight"}</p>
                      {shipment.service_type === "vehicle" && (
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          <p>VIN/Serial: {shipment.vehicle_identifier}</p>
                          <p>{shipment.vehicle_model} · {shipment.vehicle_year}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {(shipment as any).containers?.container_number || "-"}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {shipment.origin} → {shipment.destination}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="iconSm" onClick={() => handleEdit(shipment)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(shipment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}