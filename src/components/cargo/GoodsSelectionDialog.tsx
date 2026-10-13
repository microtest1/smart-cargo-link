import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  useContainerItems,
  ContainerItem,
  DeliveryZone,
} from "@/hooks/useContainerItems";
import { useContainers } from "@/hooks/useContainers";
import { useAuth } from "@/hooks/useAuth";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";
import {
  Package,
  Calculator,
  Loader2,
  Receipt,
  Search,
  CheckSquare,
  Weight,
  Ship,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Users,
  Lock,
} from "lucide-react";

interface GoodsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateInvoice?: (selectionData: SelectionData, containerName: string, containerId: string) => void;
}

interface SelectedItem {
  item: ContainerItem;
  quantity: number;
  cbm: number;
}

export interface SelectionData {
  items: SelectedItem[];
  totalCbm: number;
  totalWeight: number;
  totalCartons: number;
  deliveryZone: DeliveryZone | null;
  deliveryFee: number;
  totalAmount: number;
  containerId: string;
}

type Step = "containers" | "packages" | "confirm" | "result";

interface ShippingMarkGroup {
  mark: string;
  items: ContainerItem[];
  isMine: boolean;
}

export function GoodsSelectionDialog({
  open,
  onOpenChange,
  onGenerateInvoice,
}: GoodsSelectionDialogProps) {
  const { profile, user } = useAuth();
  const { containers, isLoading: containersLoading } = useContainers();

  const [step, setStep] = useState<Step>("containers");
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { items, isLoading: itemsLoading } = useContainerItems(selectedContainerId);

  const userCode = profile?.unique_code;
  const userName = profile?.full_name;
  const userPhone = profile?.phone;

  // Multi-tier item matching
  const isMyItem = useMemo(() => {
    const normalizedName = userName?.toLowerCase().replace(/\s+/g, " ").trim() || "";
    const phoneDigits = userPhone?.replace(/\D/g, "").slice(-9) || "";
    const codeNormalized = userCode?.toLowerCase().replace(/[-_\s]/g, "") || "";

    return (item: ContainerItem): boolean => {
      if (!item.user_code) return false;
      const markRaw = item.user_code;
      const markNorm = markRaw.toLowerCase().replace(/[-_\s]/g, "");
      
      // Exact code match
      if (userCode && markRaw === userCode) return true;
      // Normalized code match (AEF_Amin vs AEF-Amin)
      if (codeNormalized && markNorm === codeNormalized) return true;
      // Code contained in mark or vice versa
      if (codeNormalized.length >= 4 && (markNorm.includes(codeNormalized) || codeNormalized.includes(markNorm))) return true;
      // Fuzzy name match: strip AEF prefix from mark, compare against name words
      if (normalizedName) {
        const markStripped = markRaw.toLowerCase().replace(/^aef[_\s-]*/i, "").replace(/[_-]/g, " ").trim();
        const nameWords = normalizedName.split(" ").filter(w => w.length > 2);
        if (nameWords.length > 0 && nameWords.some(word => markStripped.includes(word))) return true;
        // Also check if mark stripped matches any full name part
        if (markStripped.length > 2 && normalizedName.includes(markStripped)) return true;
      }
      // Phone match in notes
      if (phoneDigits.length >= 9 && item.notes) {
        const notesDigits = item.notes.replace(/\D/g, "");
        if (notesDigits.includes(phoneDigits)) return true;
      }
      return false;
    };
  }, [userCode, userName, userPhone]);

  // Group ALL items by shipping mark, with user's group first
  const groupedItems = useMemo(() => {
    const groups: Record<string, { items: ContainerItem[]; isMine: boolean }> = {};
    
    for (const item of items) {
      const mark = item.user_code || "Unknown";
      if (!groups[mark]) {
        groups[mark] = { items: [], isMine: false };
      }
      groups[mark].items.push(item);
      if (isMyItem(item)) {
        groups[mark].isMine = true;
      }
    }

    // Sort: user's groups first, then alphabetically
    const sorted: ShippingMarkGroup[] = Object.entries(groups)
      .map(([mark, data]) => ({ mark, items: data.items, isMine: data.isMine }))
      .sort((a, b) => {
        if (a.isMine && !b.isMine) return -1;
        if (!a.isMine && b.isMine) return 1;
        return a.mark.localeCompare(b.mark);
      });

    return sorted;
  }, [items, isMyItem]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchFilter) return groupedItems;
    const q = searchFilter.toLowerCase();
    return groupedItems.filter((group) =>
      group.mark.toLowerCase().includes(q) ||
      group.items.some(item =>
        item.item_name.toLowerCase().includes(q) ||
        item.item_name_chinese?.toLowerCase().includes(q)
      )
    );
  }, [groupedItems, searchFilter]);

  const myGroups = filteredGroups.filter(g => g.isMine);
  const myItems = myGroups.flatMap(g => g.items);
  const allItems = filteredGroups.flatMap(g => g.items);

  // Totals
  const totalCbm = selectedItems.reduce((sum, si) => sum + si.cbm, 0);
  const totalWeight = selectedItems.reduce((sum, si) => sum + (si.item.total_weight || 0), 0);
  const totalCartons = selectedItems.reduce((sum, si) => sum + (si.item.carton_count || 0), 0);
  const totalQuantity = selectedItems.reduce((sum, si) => sum + si.quantity, 0);
  const { pricing } = useCbmPricing();
  const pricePerCbm = pricing.effectiveRate;
  const totalAmount = freightForCbm(totalCbm, pricing);

  useEffect(() => {
    if (!open) {
      setStep("containers");
      setSelectedContainerId("");
      setSelectedItems([]);
      setSearchFilter("");
    }
  }, [open]);

  const toggleItemSelection = (item: ContainerItem, selected: boolean) => {
    if (selected) {
      setSelectedItems((prev) => [...prev, { item, quantity: item.available_quantity || item.quantity, cbm: item.total_cbm }]);
    } else {
      setSelectedItems((prev) => prev.filter((si) => si.item.id !== item.id));
    }
  };

  const isItemSelected = (itemId: string): boolean => selectedItems.some((si) => si.item.id === itemId);

  const selectAllMyItems = () => {
    setSelectedItems(myItems.map((item) => ({
      item,
      quantity: item.available_quantity || item.quantity,
      cbm: item.total_cbm,
    })));
  };

  const selectAllGroupItems = (groupItems: ContainerItem[]) => {
    const currentIds = new Set(selectedItems.map(si => si.item.id));
    const allInGroupSelected = groupItems.every(item => currentIds.has(item.id));
    if (allInGroupSelected) {
      // Deselect all in this group
      setSelectedItems(prev => prev.filter(si => !groupItems.some(gi => gi.id === si.item.id)));
    } else {
      // Select all in this group (add missing ones)
      const newSelections = groupItems
        .filter(item => !currentIds.has(item.id))
        .map(item => ({ item, quantity: item.available_quantity || item.quantity, cbm: item.total_cbm }));
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  const deselectAllItems = () => setSelectedItems([]);

  const allMyItemsSelected = myItems.length > 0 && myItems.every((item) => isItemSelected(item.id));
  const isGroupAllSelected = (groupItems: ContainerItem[]) => groupItems.length > 0 && groupItems.every(item => isItemSelected(item.id));

  const handleContainerClick = (containerId: string) => {
    setSelectedContainerId(containerId);
    setSelectedItems([]);
    setSearchFilter("");
    setStep("packages");
  };

  const handleCalculateCbm = () => setStep("confirm");
  const handleConfirmCbm = () => setStep("result");

  const handleGenerateInvoice = () => {
    if (!user || !profile || selectedItems.length === 0 || !selectedContainerId) return;
    const selectedContainerObj = containers.find(c => c.id === selectedContainerId);
    const containerName = selectedContainerObj?.container_number || "Unknown Container";
    onGenerateInvoice?.({
      items: selectedItems,
      totalCbm,
      totalWeight,
      totalCartons,
      deliveryZone: null,
      deliveryFee: 0,
      totalAmount,
      containerId: selectedContainerId,
    }, containerName, selectedContainerId);
    onOpenChange(false);
  };

  const selectedContainerObj = containers.find(c => c.id === selectedContainerId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "loading": return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
      case "in_transit": return "bg-blue-500/15 text-blue-700 border-blue-200";
      case "arrived": return "bg-amber-500/15 text-amber-700 border-amber-200";
      case "delivered": return "bg-primary/15 text-primary border-primary/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "loading": return "Loading";
      case "in_transit": return "In Transit";
      case "arrived": return "Arrived";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  // No longer using card renderer — table layout is inline below

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        {/* STEP 1: Container Selection */}
        {step === "containers" && (
          <>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Automatic CBM Calculator
              </DialogTitle>
              <DialogDescription>
                Select a container to view and choose your packages
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="space-y-3">
                {containersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : containers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Ship className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No containers available</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Available Containers ({containers.length})
                    </p>
                    {containers.map((c) => (
                      <Card
                        key={c.id}
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                        onClick={() => handleContainerClick(c.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Ship className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm">{c.container_number}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(c.status)}`}>
                                  {getStatusLabel(c.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {c.current_load} packages
                                </span>
                              </div>
                              {c.estimated_arrival && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  ETA: {new Date(c.estimated_arrival).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {/* STEP 2: Package Selection - Grouped by Shipping Mark */}
        {step === "packages" && (
          <>
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="iconSm" onClick={() => setStep("containers")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <DialogTitle className="text-base">
                    {selectedContainerObj?.container_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Packages grouped by Shipping Mark · Select yours to calculate CBM
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by mark, name, or product..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 pb-4">
                {itemsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No packages found</p>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.mark} className="space-y-2">
                      {/* Group Header */}
                      <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        group.isMine
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50 border border-border/50"
                      }`}>
                        <div className="flex items-center gap-2">
                          <Users className={`w-4 h-4 ${group.isMine ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`font-semibold text-sm ${group.isMine ? "text-primary" : "text-muted-foreground"}`}>
                            {group.mark}
                          </span>
                          {group.isMine && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">
                              Your Packages
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {group.items.length} pkg{group.items.length !== 1 ? "s" : ""}
                          </span>
                          {group.items.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllGroupItems(group.items);
                              }}
                            >
                              <CheckSquare className="w-3 h-3 mr-1" />
                              {isGroupAllSelected(group.items) ? "Deselect" : "Select All"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Group Items - Table Layout */}
                      <div className="overflow-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-10">Select</th>
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Shipping Mark</th>
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Product</th>
                              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Qty</th>
                              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Weight</th>
                              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">CBM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => {
                              const isSelected = isItemSelected(item.id);
                              return (
                                <tr
                                  key={item.id}
                                  className={`border-b last:border-0 transition-colors cursor-pointer ${
                                    isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                                  }`}
                                  onClick={() => toggleItemSelection(item, !isSelected)}
                                >
                                  <td className="px-2 py-2 text-center">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => toggleItemSelection(item, !!checked)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-5 w-5 rounded border-2"
                                    />
                                  </td>
                                  <td className="px-2 py-2 font-medium">{item.user_code || "—"}</td>
                                  <td className="px-2 py-2">
                                    <span className="block truncate max-w-[120px]">{item.item_name}</span>
                                  </td>
                                  <td className="px-2 py-2 text-right">{item.quantity}</td>
                                  <td className="px-2 py-2 text-right">{item.total_weight?.toFixed(1) || 0} kg</td>
                                  <td className="px-2 py-2 text-right font-semibold">{item.total_cbm.toFixed(4)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Floating Calculate Button */}
            {selectedItems.length > 0 && (
              <div className="p-4 border-t bg-card">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">{selectedItems.length} package{selectedItems.length !== 1 ? "s" : ""} selected</span>
                  <span className="font-bold text-primary">{totalCbm.toFixed(4)} CBM</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCalculateCbm}>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculate My CBM
                </Button>
              </div>
            )}
          </>
        )}

        {/* STEP 3: Confirmation */}
        {step === "confirm" && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Confirm Your Selection</h3>
              <p className="text-sm text-muted-foreground">
                You have selected <strong>{selectedItems.length}</strong> package{selectedItems.length !== 1 ? "s" : ""} belonging to your Shipping Mark under <strong>{selectedContainerObj?.container_number}</strong>.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                If these represent all your goods under this container, we will calculate your CBM.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("packages")}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirmCbm}>
                <Calculator className="w-4 h-4 mr-2" />
                Confirm & Calculate
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CBM Result */}
        {step === "result" && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">CBM Calculated!</h3>
              <p className="text-sm text-muted-foreground">
                This is your estimated shipment volume based on the goods selected under your Shipping Mark.
              </p>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Packages:</span>
                  <span className="font-semibold">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cartons:</span>
                  <span className="font-semibold">{totalCartons} CTN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="font-semibold">{totalWeight.toFixed(1)} kg</span>
                </div>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Total CBM:</span>
                  <span className="font-display font-bold text-2xl text-primary">{totalCbm.toFixed(4)} m³</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Estimated Freight:</span>
                  <span className="font-bold text-primary">{formatGhs(totalAmount, pricing.currency)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Rate: {formatGhs(pricePerCbm, pricing.currency)}/CBM ({pricing.baseRate} × {pricing.exchangeRate}) · CBM: L×W×H ÷ 1,000,000
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                You can prepare for delivery payment while your shipment is in transit. When the container arrives, you will be able to request delivery.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button className="flex-1" onClick={handleGenerateInvoice}>
                <Receipt className="w-4 h-4 mr-2" />
                Generate Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
