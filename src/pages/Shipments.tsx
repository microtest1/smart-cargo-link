import { AppLayout } from "@/components/layout/AppLayout";
import { ShipmentCard } from "@/components/tracking/ShipmentCard";
import { Search, SlidersHorizontal, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useShipments, useDeleteShipment } from "@/hooks/useShipments";
import { format } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";

const tabs = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
];

export default function Shipments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const navigate = useNavigate();
  const { shipments, isLoading } = useShipments();
  const deleteShipment = useDeleteShipment();

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active")
      return matchesSearch && ["pending", "in-transit", "customs", "arrived"].includes(s.status);
    if (activeTab === "delivered") return matchesSearch && s.status === "delivered";
    return matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const handleDeleteOne = async () => {
    if (!deleteId) return;
    await deleteShipment.mutateAsync(deleteId);
    setDeleteId(null);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteShipment.mutateAsync(id);
    }
    setSelectedIds([]);
    setShowBulkDelete(false);
  };

  return (
    <AppLayout title="Shipments">
      <div className="px-4 py-5 space-y-5">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by tracking # or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl"
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl">
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "accent" : "secondary"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-5",
                activeTab === tab.id && "shadow-glow"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Results count & bulk actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredShipments.length} shipment{filteredShipments.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            {filteredShipments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
                {selectedIds.length === filteredShipments.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDelete(true)}
                className="text-xs gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading shipments...</p>
          </div>
        )}

        {/* Shipment List */}
        {!isLoading && (
          <div className="space-y-4">
            {filteredShipments.map((shipment, index) => (
              <div
                key={shipment.id}
                className="flex items-start gap-3"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="pt-5">
                  <Checkbox
                    checked={selectedIds.includes(shipment.id)}
                    onCheckedChange={() => toggleSelect(shipment.id)}
                  />
                </div>
                <div className="flex-1 relative">
                  <ShipmentCard
                    trackingNumber={shipment.tracking_number}
                    product={shipment.product}
                    status={shipment.status}
                    origin={shipment.origin}
                    destination={shipment.destination}
                    date={format(new Date(shipment.created_at), "MMM d, yyyy")}
                    company={shipment.companies?.name || "Amoliga Elite Freight"}
                    weight={shipment.weight ? `${shipment.weight} kg` : undefined}
                    onClick={() => navigate(`/shipments/${shipment.id}`)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(shipment.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredShipments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No shipments found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter
            </p>
          </div>
        )}
      </div>

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipment? This will also remove all related invoices, payments, and delivery requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOne}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Shipments</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedIds.length} shipment{selectedIds.length !== 1 ? "s" : ""} and all their related records. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
