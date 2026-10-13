import { useState } from "react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Container, Calendar, Ship, Plus, Edit, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CompanyContainers() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<any>(null);
  const [formData, setFormData] = useState({
    container_number: "",
    status: "loading",
    capacity: "100",
    current_load: "0",
    departure_date: "",
    estimated_arrival: "",
    notes: "",
  });

  // Fetch containers
  const { data: containers, isLoading } = useQuery({
    queryKey: ["company-containers", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Create/Update mutation
  const containerMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const containerData = {
        container_number: data.container_number,
        status: data.status,
        capacity: parseInt(data.capacity) || 100,
        current_load: parseInt(data.current_load) || 0,
        departure_date: data.departure_date || null,
        estimated_arrival: data.estimated_arrival || null,
        notes: data.notes || null,
        company_id: session!.companyId,
      };

      if (data.id) {
        const { error } = await supabase
          .from("containers")
          .update(containerData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("containers")
          .insert(containerData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-containers"] });
      toast({
        title: editingContainer ? "Container Updated" : "Container Created",
        description: editingContainer
          ? "The container has been updated successfully."
          : "New container has been created successfully.",
      });
      setIsAddDialogOpen(false);
      setEditingContainer(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save container",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (containerId: string) => {
      const { error } = await supabase
        .from("containers")
        .delete()
        .eq("id", containerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-containers"] });
      toast({
        title: "Container Deleted",
        description: "The container has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete container",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      container_number: "",
      status: "loading",
      capacity: "100",
      current_load: "0",
      departure_date: "",
      estimated_arrival: "",
      notes: "",
    });
  };

  const handleEdit = (container: any) => {
    setEditingContainer(container);
    setFormData({
      container_number: container.container_number,
      status: container.status,
      capacity: container.capacity?.toString() || "100",
      current_load: container.current_load?.toString() || "0",
      departure_date: container.departure_date || "",
      estimated_arrival: container.estimated_arrival || "",
      notes: container.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.container_number.trim()) {
      toast({
        title: "Error",
        description: "Please enter a container number",
        variant: "destructive",
      });
      return;
    }
    containerMutation.mutate({
      ...formData,
      id: editingContainer?.id,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "loading":
        return "bg-yellow-500";
      case "in-transit":
        return "bg-blue-500";
      case "arrived":
        return "bg-green-500";
      case "unloading":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "loading":
        return "Loading";
      case "in-transit":
        return "In Transit";
      case "arrived":
        return "Arrived";
      case "unloading":
        return "Unloading";
      default:
        return status;
    }
  };

  // Filter containers - show all containers but only allow editing of own
  const filteredContainers = containers?.filter(
    (c) =>
      c.container_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if container belongs to current company
  const isOwnContainer = (container: any) => container.company_id === session?.companyId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/company-admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-lg">Containers</h1>
              <p className="text-xs text-muted-foreground">
                Manage shipping containers
              </p>
            </div>
          </div>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingContainer(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Container
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingContainer ? "Edit Container" : "Add New Container"}
                </DialogTitle>
                <DialogDescription>
                  {editingContainer
                    ? "Update container details"
                    : "Create a new shipping container"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Container Name / Number *</Label>
                  <Input
                    value={formData.container_number}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        container_number: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Any name, e.g. March Sea Batch"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loading">Loading</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="unloading">Unloading</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, capacity: e.target.value }))
                      }
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Load</Label>
                    <Input
                      type="number"
                      value={formData.current_load}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, current_load: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departure Date</Label>
                    <Input
                      type="date"
                      value={formData.departure_date}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, departure_date: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Arrival</Label>
                  <Input
                    type="date"
                    value={formData.estimated_arrival}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, estimated_arrival: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Additional notes about this container..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={containerMutation.isPending}>
                    {containerMutation.isPending
                      ? "Saving..."
                      : editingContainer
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-white">
                  <Container className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {containers?.filter((c) => c.status === "loading").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Loading</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {containers?.filter((c) => c.status === "in-transit").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Transit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white">
                  <Container className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {containers?.filter((c) => c.status === "arrived").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Arrived</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                  <Container className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {containers?.filter((c) => c.status === "unloading").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Unloading</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredContainers && filteredContainers.length > 0 ? (
          <div className="space-y-3">
            {filteredContainers.map((container) => (
              <Card key={container.id} className={cn(
                "transition-shadow",
                isOwnContainer(container) && "hover:shadow-md"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Container className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {container.container_number}
                          </h3>
                          {isOwnContainer(container) && (
                            <Badge variant="outline" className="text-xs">
                              Your Container
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${getStatusColor(container.status)} text-white mt-1`}
                        >
                          {getStatusLabel(container.status)}
                        </Badge>
                      </div>
                    </div>

                    {isOwnContainer(container) && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(container)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Container?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete container{" "}
                                <strong>{container.container_number}</strong>. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(container.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {/* Capacity Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-medium">
                        {container.current_load || 0} / {container.capacity || 100}
                      </span>
                    </div>
                    <Progress
                      value={
                        ((container.current_load || 0) /
                          (container.capacity || 100)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {container.departure_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Departs:{" "}
                          {format(new Date(container.departure_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {container.estimated_arrival && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Arrives:{" "}
                          {format(new Date(container.estimated_arrival), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  {container.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
                      {container.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Container className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Containers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "No containers match your search"
                  : "Create your first container to start managing shipments"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Container
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
