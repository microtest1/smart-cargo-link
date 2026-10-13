import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useContainers, useCreateContainer, useUpdateContainer } from "@/hooks/useContainers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Ship, Edit, Calendar, Package, Upload, Satellite } from "lucide-react";
import { format } from "date-fns";
import { ContainerCSVUpload } from "@/components/admin/ContainerCSVUpload";
import { ContainerItemsCSVUpload } from "@/components/admin/ContainerItemsCSVUpload";
import { Ship24ExcelUpload } from "@/components/admin/Ship24ExcelUpload";

export default function AdminContainers() {
  const { containers, isLoading, refetch } = useContainers();
  const createContainer = useCreateContainer();
  const updateContainer = useUpdateContainer();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [itemsUploadOpen, setItemsUploadOpen] = useState(false);
  const [ship24UploadOpen, setShip24UploadOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    container_number: "",
    shipping_container_number: "",
    seal_number: "",
    container_type: "",
    origin: "",
    destination: "",
    loading_date: "",
    departure_date: "",
    estimated_arrival: "",
    capacity: 100,
    current_load: 0,
    status: "loading",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      container_number: "",
      shipping_container_number: "",
      seal_number: "",
      container_type: "",
      origin: "",
      destination: "",
      loading_date: "",
      departure_date: "",
      estimated_arrival: "",
      capacity: 100,
      current_load: 0,
      status: "loading",
      notes: "",
    });
    setEditingContainer(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (container: any) => {
    setEditingContainer(container);
    setFormData({
      container_number: container.container_number,
      shipping_container_number: container.shipping_container_number || "",
      seal_number: container.seal_number || "",
      container_type: container.container_type || "",
      origin: container.origin || "",
      destination: container.destination || "",
      loading_date: container.loading_date || "",
      departure_date: container.departure_date || "",
      estimated_arrival: container.estimated_arrival || "",
      capacity: container.capacity,
      current_load: container.current_load,
      status: container.status,
      notes: container.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
      container_number: formData.container_number || undefined,
      shipping_container_number: formData.shipping_container_number || null,
      seal_number: formData.seal_number || null,
      container_type: formData.container_type || null,
      origin: formData.origin || null,
      destination: formData.destination || null,
      loading_date: formData.loading_date || null,
      departure_date: formData.departure_date || null,
      estimated_arrival: formData.estimated_arrival || null,
      capacity: formData.capacity,
      current_load: formData.current_load,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (editingContainer) {
      await updateContainer.mutateAsync({ id: editingContainer.id, ...data });
    } else {
      await createContainer.mutateAsync(data);
    }

    setDialogOpen(false);
    resetForm();
  };

  const statusOptions = [
    { value: "loading", label: "Loading" },
    { value: "in_transit", label: "In Transit" },
    { value: "arrived", label: "Arrived" },
    { value: "delivered", label: "Delivered" },
  ];

  return (
    <AdminLayout title="Container Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Containers</h2>
            <p className="text-muted-foreground">Manage shipping containers</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" onClick={() => setShip24UploadOpen(true)}>
              <Satellite className="w-4 h-4 mr-2" />
              Ship24 Upload
            </Button>
            <Button variant="outline" onClick={() => setCsvUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Containers
            </Button>
            <Button variant="outline" onClick={() => setItemsUploadOpen(true)}>
              <Package className="w-4 h-4 mr-2" />
              Upload Items
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Container
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingContainer ? "Edit Container" : "Create New Container"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Container Name / Number</Label>
                  <Input
                    placeholder="Any name you like, e.g. March Sea Batch"
                    value={formData.container_number}
                    onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Name it any way you want — leave blank to auto-generate.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shipping Container</Label>
                    <Input value={formData.shipping_container_number} onChange={(e) => setFormData({ ...formData, shipping_container_number: e.target.value })} placeholder="e.g. TGBU4543906" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seal Number</Label>
                    <Input value={formData.seal_number} onChange={(e) => setFormData({ ...formData, seal_number: e.target.value })} placeholder="e.g. FJ28500932" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Container Type</Label><Input value={formData.container_type} onChange={(e) => setFormData({ ...formData, container_type: e.target.value })} placeholder="40HQ" /></div>
                  <div className="space-y-2"><Label>Loading Date</Label><Input type="date" value={formData.loading_date} onChange={(e) => setFormData({ ...formData, loading_date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Origin</Label><Input value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Destination</Label><Input value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Date</Label>
                    <Input
                      type="date"
                      value={formData.departure_date}
                      onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Arrival</Label>
                    <Input
                      type="date"
                      value={formData.estimated_arrival}
                      onChange={(e) => setFormData({ ...formData, estimated_arrival: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Load</Label>
                    <Input
                      type="number"
                      value={formData.current_load}
                      onChange={(e) => setFormData({ ...formData, current_load: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createContainer.isPending || updateContainer.isPending}>
                  {editingContainer ? "Update Container" : "Create Container"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <ContainerCSVUpload open={csvUploadOpen} onOpenChange={setCsvUploadOpen} />
        <ContainerItemsCSVUpload open={itemsUploadOpen} onOpenChange={setItemsUploadOpen} />
        <Ship24ExcelUpload open={ship24UploadOpen} onOpenChange={setShip24UploadOpen} />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : containers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ship className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No containers yet</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Container
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {containers.map((container) => (
              <Card key={container.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{container.container_number}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(container)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge
                    className={
                      container.status === "loading"
                        ? "bg-yellow-500"
                        : container.status === "in_transit"
                        ? "bg-blue-500"
                        : container.status === "arrived"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }
                  >
                    {container.status.replace("_", " ")}
                  </Badge>

                  <div className="space-y-2 text-sm">
                    {container.shipping_container_number && <p><span className="text-muted-foreground">Shipping:</span> <span className="font-mono">{container.shipping_container_number}</span></p>}
                    {(container.seal_number || container.container_type) && <p className="text-muted-foreground">{container.container_type || "Container"}{container.seal_number ? ` · Seal ${container.seal_number}` : ""}</p>}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Departs: {container.departure_date 
                          ? format(new Date(container.departure_date), "MMM dd, yyyy")
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        ETA: {container.estimated_arrival
                          ? format(new Date(container.estimated_arrival), "MMM dd, yyyy")
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span>
                        Load: {container.current_load} / {container.capacity}
                      </span>
                    </div>
                  </div>

                  {container.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                      {container.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
