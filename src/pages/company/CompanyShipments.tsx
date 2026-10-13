import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Edit,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  received_china: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_transit: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "in-transit": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  arrived_ghana: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  customs: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  arrived: "bg-green-500/10 text-green-600 border-green-500/20",
  ready_collection: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};


export default function CompanyShipments() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    user_code: "",
    tracking_number: "",
    product: "",
    origin: "China",
    destination: "Ghana",
    weight: "",
    dimensions: "",
    status: "received_china" as ShipmentStatus,
    container_id: "",
    notes: "",
    customer_name: "",
    customer_phone: "",
    customer_location: "",
    service_type: "sea_freight",
    vehicle_identifier: "",
    vehicle_model: "",
    vehicle_year: "",
  });

  // Fetch shipments for this company
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["company-shipments", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, containers(container_number)")
        .eq("company_id", session!.companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Fetch containers for this company
  const { data: containers } = useQuery({
    queryKey: ["company-containers", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .eq("company_id", session!.companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Customer codes belonging to this company (for autocomplete + account linking)
  const { data: customers } = useQuery({
    queryKey: ["company-customer-codes", session?.companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, unique_code")
        .not("unique_code", "is", null)
        .order("unique_code", { ascending: true });
      return data || [];
    },
    enabled: !!session?.companyId,
  });

  // Create/Update mutation
  const shipmentMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      let trackingNumber = data.tracking_number.trim();

      // Auto-generate tracking number for new shipments if not provided
      if (!data.id && !trackingNumber) {
        const { data: generatedNumber, error: genError } = await supabase
          .rpc('generate_tracking_number');
        if (genError || !generatedNumber) {
          throw new Error("Could not generate a tracking number. Please enter one manually.");
        }
        trackingNumber = generatedNumber as string;
      }

      const userCode = data.user_code.trim().toUpperCase();

      // Link the shipment to the customer's account so it appears on their dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("unique_code", userCode)
        .maybeSingle();

      const shipmentData = {
        user_code: userCode,
        user_id: profile?.user_id ?? null,
        tracking_number: trackingNumber,
        product: data.product.trim(),
        origin: data.origin.trim(),
        destination: data.destination.trim(),
        weight: data.weight ? parseFloat(data.weight) : null,
        dimensions: data.dimensions?.trim() || null,
        status: data.status as ShipmentStatus,
        container_id: data.container_id || null,
        notes: data.notes?.trim() || null,
        customer_name: data.customer_name?.trim() || null,
        customer_phone: data.customer_phone?.trim() || null,
        customer_location: data.customer_location?.trim() || null,
        service_type: data.service_type || null,
        vehicle_identifier: data.service_type === "vehicle" ? data.vehicle_identifier.trim() : null,
        vehicle_model: data.service_type === "vehicle" ? data.vehicle_model.trim() : null,
        vehicle_year: data.service_type === "vehicle" ? Number(data.vehicle_year) : null,
        company_id: session!.companyId,
      };

      const stageChanged = !data.id || editingShipment?.status !== data.status;

      let shipmentId = data.id;
      if (data.id) {
        const { error } = await supabase.from("shipments").update(shipmentData).eq("id", data.id);
        if (error) {
          if ((error as any).code === "23505" || error.message?.includes("duplicate")) {
            throw new Error(`Tracking number ${trackingNumber} already exists`);
          }
          throw error;
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("shipments")
          .insert(shipmentData)
          .select("id")
          .maybeSingle();
        if (error) {
          if ((error as any).code === "23505" || error.message?.includes("duplicate")) {
            throw new Error(`Tracking number ${trackingNumber} already exists`);
          }
          throw error;
        }
        shipmentId = inserted?.id;
      }

      // Stage change → SMS + email (in-app notification is created by a DB trigger)
      let notified: { sms?: unknown; email?: unknown } | null = null;
      if (stageChanged && shipmentId && session?.token) {
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke(
          "notify-shipment-status",
          { body: { shipmentId }, headers: { "x-company-token": session.token } },
        );
        if (notifyError) {
          console.error("notify-shipment-status failed", notifyError);
        } else {
          notified = notifyData as any;
        }
      }

      return { trackingNumber, linked: !!profile?.user_id, isEdit: !!data.id, notified, stageChanged };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["company-shipments"] });
      toast({
        title: result.isEdit ? "Shipment Updated" : `Shipment ${result.trackingNumber} created`,
        description: result.stageChanged
          ? `Customer notified — SMS: ${result.notified?.sms ?? "failed"}, Email: ${result.notified?.email ?? "failed"}`
          : result.isEdit
            ? "The shipment has been updated successfully."
            : result.linked
              ? "Linked to the customer account."
              : "No matching customer account found — it will link once the code exists.",
      });
      setIsAddDialogOpen(false);
      setEditingShipment(null);
      resetForm();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save shipment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      user_code: "",
      tracking_number: "",
      product: "",
      origin: "China",
      destination: "Ghana",
      weight: "",
      dimensions: "",
      status: "received_china" as ShipmentStatus,
      container_id: "",
      notes: "",
      customer_name: "",
      customer_phone: "",
      customer_location: "",
      service_type: "sea_freight",
      vehicle_identifier: "",
      vehicle_model: "",
      vehicle_year: "",
    });
  };

  const handleEdit = (shipment: any) => {
    setEditingShipment(shipment);
    setFormData({
      user_code: shipment.user_code,
      tracking_number: shipment.tracking_number,
      product: shipment.product,
      origin: shipment.origin,
      destination: shipment.destination,
      weight: shipment.weight?.toString() || "",
      dimensions: shipment.dimensions || "",
      status: shipment.status,
      container_id: shipment.container_id || "",
      notes: shipment.notes || "",
      customer_name: shipment.customer_name || "",
      customer_phone: shipment.customer_phone || "",
      customer_location: shipment.customer_location || "",
      service_type: shipment.service_type || "sea_freight",
      vehicle_identifier: shipment.vehicle_identifier || "",
      vehicle_model: shipment.vehicle_model || "",
      vehicle_year: shipment.vehicle_year?.toString() || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Tracking number is only required when editing (for new shipments it will be auto-generated)
    if (!formData.user_code || !formData.product) {
      toast({
        title: "Error",
        description: "Please fill in Customer Code and Product Description",
        variant: "destructive",
      });
      return;
    }
    if (editingShipment && !formData.tracking_number) {
      toast({
        title: "Error",
        description: "Tracking number is required",
        variant: "destructive",
      });
      return;
    }
    if (formData.service_type === "vehicle" && (!formData.vehicle_identifier.trim() || !formData.vehicle_model.trim() || !formData.vehicle_year)) {
      toast({ title: "Vehicle details required", description: "Enter the chassis/VIN/serial number, model and year.", variant: "destructive" });
      return;
    }
    shipmentMutation.mutate({
      ...formData,
      id: editingShipment?.id,
    });
  };

  const filteredShipments = shipments?.filter(s => 
    s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/company-admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-lg">Shipments</h1>
              <p className="text-xs text-muted-foreground">{shipments?.length || 0} total shipments</p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingShipment(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingShipment ? "Edit Shipment" : "Add New Shipment"}</DialogTitle>
                <DialogDescription>
                  {editingShipment ? "Update shipment details" : "Create a new shipment for a customer"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Code *</Label>
                    <Input
                      list="company-customer-codes"
                      value={formData.user_code}
                      onChange={(e) => setFormData(p => ({ ...p, user_code: e.target.value.toUpperCase() }))}
                      placeholder="AEF_XXXXX"
                    />
                    <datalist id="company-customer-codes">
                      {customers?.map((c) => (
                        <option key={c.user_id} value={c.unique_code ?? ""}>
                          {c.full_name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>{editingShipment ? "Tracking Number *" : "Tracking Number"}</Label>
                    <Input
                      value={formData.tracking_number}
                      onChange={(e) => setFormData(p => ({ ...p, tracking_number: e.target.value }))}
                      placeholder={editingShipment ? "TRK-XXXXXX" : "Auto-generated if empty"}
                    />
                    {!editingShipment && (
                      <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-4 space-y-4">
                  <p className="text-sm font-medium">Customer Contact & Location</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={formData.customer_name}
                        onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                        placeholder="Kwame Mensah"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Contact</Label>
                      <Input
                        value={formData.customer_phone}
                        onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                        placeholder="233241234567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Location / Delivery Address</Label>
                    <Input
                      value={formData.customer_location}
                      onChange={(e) => setFormData(p => ({ ...p, customer_location: e.target.value }))}
                      placeholder="East Legon, Accra"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Product Description *</Label>
                  <Input
                    value={formData.product}
                    onChange={(e) => setFormData(p => ({ ...p, product: e.target.value }))}
                    placeholder="e.g., Electronics, Clothing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Service *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => setFormData((p) => ({ ...p, service_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea_freight">Sea Freight</SelectItem>
                      <SelectItem value="vehicle">Car / Vehicle Shipping</SelectItem>
                      <SelectItem value="air_freight">Air Freight</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.service_type === "vehicle" && (
                  <div className="space-y-4 rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-medium">Vehicle Details</p>
                    <div className="space-y-2"><Label>Chassis / VIN / Serial Number *</Label><Input value={formData.vehicle_identifier} onChange={(e) => setFormData((p) => ({ ...p, vehicle_identifier: e.target.value }))} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Model *</Label><Input value={formData.vehicle_model} onChange={(e) => setFormData((p) => ({ ...p, vehicle_model: e.target.value }))} required /></div>
                      <div className="space-y-2"><Label>Year *</Label><Input type="number" min="1886" max="2200" value={formData.vehicle_year} onChange={(e) => setFormData((p) => ({ ...p, vehicle_year: e.target.value }))} required /></div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData(p => ({ ...p, origin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      value={formData.destination}
                      onChange={(e) => setFormData(p => ({ ...p, destination: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData(p => ({ ...p, weight: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dimensions</Label>
                    <Input
                      value={formData.dimensions}
                      onChange={(e) => setFormData(p => ({ ...p, dimensions: e.target.value }))}
                      placeholder="LxWxH cm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}
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
                      value={formData.container_id || "none"}
                      onValueChange={(v) => setFormData(p => ({ ...p, container_id: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select container" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {containers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.container_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={shipmentMutation.isPending}>
                    {shipmentMutation.isPending ? "Saving..." : editingShipment ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number, customer code, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Shipments List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredShipments?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No shipments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredShipments?.map((shipment) => (
              <Card key={shipment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-semibold">{shipment.tracking_number}</span>
                        <Badge variant="outline" className={cn("text-xs", statusColors[shipment.status])}>
                          {shipment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{shipment.product}</p>
                      <p className="text-xs font-medium mb-1">
                        {shipment.service_type === "vehicle" ? "Car / Vehicle Shipping" : shipment.service_type === "air_freight" ? "Air Freight" : shipment.service_type === "other" ? "Other" : "Sea Freight"}
                      </p>
                      {shipment.service_type === "vehicle" && (
                        <p className="text-xs text-muted-foreground mb-1">VIN/Serial: {shipment.vehicle_identifier} · {shipment.vehicle_model} · {shipment.vehicle_year}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Customer: {shipment.customer_name || shipment.user_code}</span>
                        <span>AEF Code: {shipment.user_code}</span>
                        {shipment.customer_phone && <span>Phone: {shipment.customer_phone}</span>}
                        {shipment.customer_location && <span>GH: {shipment.customer_location}</span>}
                        {shipment.weight && <span>Weight: {shipment.weight}kg</span>}
                        {shipment.containers && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {shipment.containers.container_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {format(new Date(shipment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Edit shipment" onClick={() => handleEdit(shipment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
