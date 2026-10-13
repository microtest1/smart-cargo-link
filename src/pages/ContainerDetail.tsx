import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useContainerById } from "@/hooks/useContainers";
import { useContainerItems, ContainerItem } from "@/hooks/useContainerItems";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Ship, Package, Search, ArrowLeft, Loader2,
  MapPin, Weight, CheckCircle2, Calculator, CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GoodsSelectionDialog, SelectionData } from "@/components/cargo/GoodsSelectionDialog";
import { InvoiceResultDialog, InvoiceResultData } from "@/components/cargo/InvoiceResultDialog";
import { generateInvoiceFromSelection } from "@/hooks/useInvoiceGeneration";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

const statusColors: Record<string, string> = {
  loading: "bg-green-500",
  in_transit: "bg-blue-500",
  arrived: "bg-orange-500",
  delivered: "bg-muted-foreground",
};

const statusLabels: Record<string, string> = {
  loading: "Receiving at Warehouse",
  in_transit: "In Transit",
  arrived: "Arrived in Ghana",
  delivered: "Ready for Pickup",
};

export default function ContainerDetail() {
  const { pricing } = useCbmPricing();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { container, isLoading: containerLoading } = useContainerById(id || "");
  const { items, isLoading: itemsLoading } = useContainerItems(id);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCbmCalculator, setShowCbmCalculator] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<InvoiceResultData | null>(null);
  const [showInvoiceResult, setShowInvoiceResult] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAll = (itemList: ContainerItem[]) => {
    const allSelected = itemList.every(i => selectedItemIds.has(i.id));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      itemList.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
      return next;
    });
  };

  const selectedTotalCbm = useMemo(() => {
    return items.filter(i => selectedItemIds.has(i.id)).reduce((s, i) => s + i.total_cbm, 0);
  }, [items, selectedItemIds]);

  const userCode = profile?.unique_code;
  const userName = profile?.full_name;
  const userPhone = profile?.phone;

  // Check if an item belongs to the current user
  const isMyItem = useMemo(() => {
    const normalizedName = userName?.toLowerCase().replace(/\s+/g, " ").trim() || "";
    const phoneDigits = userPhone?.replace(/\D/g, "").slice(-9) || "";
    
    return (item: ContainerItem): boolean => {
      if (userCode && item.user_code === userCode) return true;
      if (normalizedName && item.user_code) {
        const markNormalized = item.user_code.toLowerCase()
          .replace(/^aef[_\s]*/i, "")
          .replace(/[_]/g, " ")
          .trim();
        const nameWords = normalizedName.split(" ").filter(w => w.length > 2);
        if (nameWords.length > 0 && nameWords.some(word => markNormalized.includes(word))) {
          return true;
        }
      }
      if (phoneDigits.length >= 9 && item.notes) {
        const notesDigits = item.notes.replace(/\D/g, "");
        if (notesDigits.includes(phoneDigits)) return true;
      }
      return false;
    };
  }, [userCode, userName, userPhone]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => {
      const searchable = [
        item.user_code || "",
        item.item_name || "",
        item.item_name_chinese || "",
        item.notes || "",
        String(item.carton_count || item.quantity),
        item.total_cbm.toFixed(2),
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [items, searchQuery]);

  // Split into my items and others
  const { myItems, otherItems } = useMemo(() => {
    const mine = filteredItems.filter(isMyItem);
    const others = filteredItems.filter((i) => !isMyItem(i));
    return { myItems: mine, otherItems: others };
  }, [filteredItems, isMyItem]);

  // Handle invoice generation after CBM calculation
  const handleGenerateInvoice = async (selectionData: SelectionData, containerName: string, containerId: string) => {
    if (!user || !profile) {
      toast({ title: "Please log in", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInvoiceFromSelection({
        userId: user.id,
        profile: { full_name: profile.full_name, email: profile.email, unique_code: profile.unique_code },
        containerId,
        containerName,
        items: selectionData.items,
        totalCbm: selectionData.totalCbm,
      });

      // Build invoice result data for the dialog
      const invoiceData: InvoiceResultData = {
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        trackingNumber: result.trackingNumber,
        shipmentId: result.shipmentId,
        containerName,
        items: selectionData.items.map(si => ({
          name: si.item.item_name,
          nameChinese: si.item.item_name_chinese || undefined,
          quantity: si.quantity,
          cartons: si.item.carton_count || 0,
          weight: si.item.total_weight || 0,
          cbm: si.cbm,
        })),
        totalCbm: selectionData.totalCbm,
        totalWeight: result.totalWeight,
        totalCartons: result.totalCartons,
        goodsCost: result.goodsCost,
        totalAmount: result.totalAmount,
        createdAt: new Date(),
      };

      setInvoiceResult(invoiceData);
      setShowInvoiceResult(true);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["container-items"] });

      toast({ title: "Invoice Generated!", description: `Invoice ${result.invoiceNumber} created successfully.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate invoice", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (containerLoading) {
    return (
      <AppLayout title="Container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!container) {
    return (
      <AppLayout title="Container">
        <div className="text-center py-16 px-4">
          <Ship className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Container not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="">
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Ship className="w-5 h-5 text-primary" />
                {container.container_number}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>China Warehouse → Ghana</span>
              </div>
            </div>
            <Badge className={cn("text-white", statusColors[container.status] || "bg-muted-foreground")}>
              {statusLabels[container.status] || container.status}
            </Badge>
          </div>

          {container.estimated_arrival && (
            <p className="text-xs text-muted-foreground mb-3">
              ETA: {format(new Date(container.estimated_arrival), "dd MMM yyyy")}
            </p>
          )}

          {/* CBM Calculator Button */}
          <Button
            className="w-full mb-3"
            size="lg"
            onClick={() => setShowCbmCalculator(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating Invoice...</>
            ) : (
              <><Calculator className="w-5 h-5 mr-2" />Calculate CBM & Generate Invoice</>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Shipping Mark, Product, or Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        {/* Package List with Scroll */}
        <div className="px-4 pb-20 flex flex-col" style={{ minHeight: 0 }}>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading packages...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No packages in this container yet</p>
            </div>
          ) : (
            <>
              {/* Total items count & selection controls */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-background z-10 py-2">
                <p className="text-sm font-bold">
                  Total Packages: <span className="text-primary">{items.length}</span>
                  {filteredItems.length !== items.length && (
                    <span className="text-muted-foreground font-normal ml-1">(showing {filteredItems.length})</span>
                  )}
                </p>
                {selectedItemIds.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedItemIds.size} selected · {selectedTotalCbm.toFixed(4)} CBM · {formatGhs(freightForCbm(selectedTotalCbm, pricing), pricing.currency)}
                  </Badge>
                )}
              </div>

              {/* My Packages */}
              {myItems.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      My Goods in this Container
                      <Badge variant="secondary" className="text-xs">{myItems.length}</Badge>
                    </h2>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectAll(myItems)}>
                      <CheckSquare className="w-3.5 h-3.5 mr-1" />
                      {myItems.every(i => selectedItemIds.has(i.id)) ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {myItems.map((item, idx) => (
                      <PackageCard
                        key={item.id}
                        item={item}
                        isOwn
                        index={idx + 1}
                        isSelected={selectedItemIds.has(item.id)}
                        onToggle={() => toggleItemSelection(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myItems.length === 0 && userCode && (
                <div className="text-center py-10 mb-6">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No packages assigned to your code ({userCode})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the search bar above to find your packages by shipping mark or tracking code
                  </p>
                </div>
              )}

              {/* All Container Packages */}
              {otherItems.length > 0 && (
                <div>
                  {myItems.length > 0 && <div className="border-t border-border mb-4" />}
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Other Packages in Container
                      <Badge variant="outline" className="text-xs">{otherItems.length}</Badge>
                    </h2>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectAll(otherItems)}>
                      <CheckSquare className="w-3.5 h-3.5 mr-1" />
                      {otherItems.every(i => selectedItemIds.has(i.id)) ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {otherItems.map((item, idx) => (
                      <PackageCard
                        key={item.id}
                        item={item}
                        isOwn={false}
                        index={myItems.length + idx + 1}
                        isSelected={selectedItemIds.has(item.id)}
                        onToggle={() => toggleItemSelection(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CBM Calculator Dialog */}
      <GoodsSelectionDialog
        open={showCbmCalculator}
        onOpenChange={setShowCbmCalculator}
        onGenerateInvoice={handleGenerateInvoice}
      />

      {/* Invoice Result Dialog (3 options: Download, Pay, Pay Later) */}
      <InvoiceResultDialog
        open={showInvoiceResult}
        onOpenChange={setShowInvoiceResult}
        data={invoiceResult}
      />
    </AppLayout>
  );
}

/** Package Card — vertical row format with checkbox */
function PackageCard({
  item,
  isOwn,
  index,
  isSelected,
  onToggle,
}: {
  item: ContainerItem;
  isOwn: boolean;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { pricing } = useCbmPricing();
  const rows = [
    { label: "DATE", value: item.created_at ? format(new Date(item.created_at), "EEEE, dd MMMM, yyyy") : "—" },
    { label: "MARK", value: item.user_code || "—" },
    { label: "NAME", value: item.user_code || "—" },
    { label: "PRODUCT", value: item.item_name },
    ...(item.item_name_chinese ? [{ label: "PRODUCT (CN)", value: item.item_name_chinese }] : []),
    { label: "TRACKING", value: item.notes || "—" },
    { label: "CARTONS", value: String(item.carton_count || item.quantity) },
    { label: "CBM", value: item.total_cbm.toFixed(4) },
    { label: "EST. FREIGHT", value: formatGhs(freightForCbm(item.total_cbm, pricing), pricing.currency) },
  ];

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden shadow-sm border cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary border-primary shadow-md"
      )}
      onClick={onToggle}
    >
      {/* Header with checkbox */}
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        isOwn ? "bg-primary/10" : "bg-muted/50"
      )}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-6 w-6 rounded border-2"
        />
        <span className="text-xs font-bold text-muted-foreground">#{index}</span>
        {isOwn && (
          <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">
            Your Package
          </Badge>
        )}
        {isSelected && (
          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-600 text-white ml-auto">
            ✓ Selected
          </Badge>
        )}
      </div>

      {/* Data rows */}
      {rows.map((row, i) => (
        <div key={row.label} className="grid grid-cols-[100px_1fr] text-sm">
          <div className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider bg-[hsl(var(--foreground)/0.85)] text-[hsl(var(--background))] flex items-center border-b border-[hsl(var(--foreground)/0.7)]">
            {row.label}
          </div>
          <div className={cn(
            "px-3 py-2.5 font-semibold text-sm break-words border-b",
            i % 2 === 0
              ? "bg-destructive/20 text-foreground border-destructive/10"
              : "bg-destructive/30 text-foreground border-destructive/15"
          )}>
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}
