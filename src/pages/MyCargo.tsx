import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChinaWarehouseForm } from "@/components/cargo/ChinaWarehouseForm";
import { ChinaWarehouseInfo as ChinaWarehouseInfoComponent } from "@/components/warehouse/ChinaWarehouseInfo";
import { GhanaLocationForm } from "@/components/cargo/GhanaLocationForm";
import { SmartSearch } from "@/components/cargo/SmartSearch";
import { GoodsSelectionDialog, SelectionData } from "@/components/cargo/GoodsSelectionDialog";
import { InvoiceGenerationDialog } from "@/components/cargo/InvoiceGenerationDialog";
import { ContainerTrackingCard } from "@/components/cargo/ContainerTrackingCard";
import { DeliveryPartnerFlow } from "@/components/cargo/DeliveryPartnerFlow";
import { CustomerDeliveryTracker } from "@/components/cargo/CustomerDeliveryTracker";
import { useAuth } from "@/hooks/useAuth";
import { useMyContainers, Container } from "@/hooks/useContainers";
import { useShipments } from "@/hooks/useShipments";
import { useContainerItems, ContainerItem } from "@/hooks/useContainerItems";
import { Bell, Settings, Search, X, Warehouse, MapPin, Sparkles, Truck, Loader2, User, Phone, MessageCircle, AlertTriangle, RefreshCw, LogOut, ShoppingCart, Package, Ship, Calculator } from "lucide-react";
import { BuyYuanButton } from "@/components/services/BuyYuanButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs } from "@/lib/pricing";
export default function MyCargo() {
  const { pricing } = useCbmPricing();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading, signOut } = useAuth();
  const { containers, isLoading: containersLoading } = useMyContainers();
  const { shipments, refetch: refetchShipments } = useShipments();
  const { toast } = useToast();
  
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  
  // Fetch container items when a container is selected
  const { items: containerItems, isLoading: itemsLoading } = useContainerItems(selectedContainer);
  
  // Dialog states
  const [showChinaWarehouse, setShowChinaWarehouse] = useState(false);
  const [showGhanaLocation, setShowGhanaLocation] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [showDeliveryRequest, setShowDeliveryRequest] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const [showReportAbuse, setShowReportAbuse] = useState(false);
  const [showGoodsSelection, setShowGoodsSelection] = useState(false);
  const [showInvoiceGeneration, setShowInvoiceGeneration] = useState(false);
  const [selectionData, setSelectionData] = useState<SelectionData | null>(null);
  const [selectedContainerName, setSelectedContainerName] = useState<string>("");
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [deliveryContainer, setDeliveryContainer] = useState<Container | null>(null);

  const handleReloadData = async () => {
    toast({ title: "Reloading data...", description: "Please wait" });
    await queryClient.invalidateQueries();
    await refetchShipments();
    toast({ title: "Data reloaded", description: "All data has been refreshed" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleChatWithUs = () => {
    window.open("https://wa.me/233208878817?text=Hello%20Amoliga%20Elite!%20I%20need%20help.", "_blank");
  };

  const handleGenerateInvoice = (data: SelectionData, containerName: string, containerId: string) => {
    // VALIDATION: Fail gracefully if no items or container ID missing
    if (!data.items || data.items.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to generate an invoice",
        variant: "destructive",
      });
      return;
    }
    if (!containerId) {
      toast({
        title: "Container Missing",
        description: "Invoice cannot be generated without a container",
        variant: "destructive",
      });
      return;
    }
    
    setSelectionData(data);
    setSelectedContainerName(containerName);
    setSelectedContainerId(containerId); // CRITICAL: Store the container ID
    setShowInvoiceGeneration(true);
  };

  if (authLoading) {
    return (
      <AppLayout title="My Cargo">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="">
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
        {/* Header */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div>
                <h1 className="font-bold text-lg">{profile?.full_name || "User"}</h1>
                <p className="text-xs text-muted-foreground">{profile?.unique_code || "AEF_YOURNAME"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="w-5 h-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowContactUs(true)}>
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleChatWithUs}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowReportAbuse(true)}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Abuse
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReloadData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload All Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="px-4 pb-6">
          {/* Top Services Row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <BuyYuanButton compact />
            <button
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] p-[2px] shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-[position:100%_0]"
              onClick={() => setShowGoodsSelection(true)}
            >
              <div className="flex items-center gap-3 rounded-[14px] bg-card px-4 py-3 h-full transition-all duration-300 group-hover:bg-card/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-display font-bold text-xs block text-foreground">CBM Calculator</span>
                  <span className="text-[10px] text-muted-foreground">Select &amp; calculate</span>
                </div>
              </div>
            </button>
          </div>

          <Link
            to="/cbm-calculator"
            className="mb-3 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Official Sea Freight Rate</p>
              <p className="text-sm font-bold text-primary">
                {formatGhs(pricing.effectiveRate, pricing.currency)} / CBM
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pricing.baseRate} × {pricing.exchangeRate} · Estimate your charge
              </p>
            </div>
            <Calculator className="h-5 w-5 text-primary" />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            {/* Chinese Warehouse Button */}
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-xl shadow-lg"
              onClick={() => setShowChinaWarehouse(true)}
            >
              <Warehouse className="w-6 h-6" />
              <span className="font-semibold text-sm">Chinese Warehouse</span>
            </Button>

            {/* Ghana Location Button */}
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-xl shadow-lg"
              onClick={() => setShowGhanaLocation(true)}
            >
              <MapPin className="w-6 h-6" />
              <span className="font-semibold text-sm">Ghana Location</span>
            </Button>

            {/* AI Search Button */}
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted border rounded-xl shadow-sm"
              onClick={() => setShowAISearch(true)}
            >
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-semibold text-sm">AI Search</span>
            </Button>

            {/* Request Delivery Button */}
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted border rounded-xl shadow-sm"
              onClick={() => setShowDeliveryRequest(true)}
            >
              <Truck className="w-6 h-6 text-primary" />
              <span className="font-semibold text-sm">Request Delivery</span>
            </Button>
          </div>
        </div>

        {/* Active Delivery Tracking */}
        <div className="px-4 pb-4">
          <CustomerDeliveryTracker />
        </div>

        {/* Container Tracking Section */}
        <div className="px-4 pb-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" />
              My Containers
            </h2>
            <Badge variant="secondary" className="text-xs">
              {containers.length} container{containers.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {containersLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading containers...</span>
            </div>
          ) : containers.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-lg border text-center">
              <Ship className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground mb-1">No containers found</p>
              <p className="text-xs text-muted-foreground">
                Containers will appear here once your goods are assigned to a shipment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {containers.map((container, index) => (
                <ContainerTrackingCard
                  key={container.id}
                  container={container}
                  index={index}
                  onRequestDelivery={(c) => {
                    setDeliveryContainer(c);
                    setShowDeliveryRequest(true);
                  }}
                  onSelectGoods={(containerId) => setShowGoodsSelection(true)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chinese Warehouse Dialog */}
      <Dialog open={showChinaWarehouse} onOpenChange={setShowChinaWarehouse}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>China Warehouse Address</DialogTitle>
            <DialogDescription>
              Official Amoliga Elite warehouse addresses and shipping instructions
            </DialogDescription>
          </DialogHeader>
          <ChinaWarehouseInfoComponent
            userCode={profile?.unique_code || undefined}
            userName={profile?.full_name || undefined}
            userPhone={profile?.phone || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Ghana Location Dialog */}
      <Dialog open={showGhanaLocation} onOpenChange={setShowGhanaLocation}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ghana Location</DialogTitle>
            <DialogDescription>
              Manage your delivery locations in Ghana
            </DialogDescription>
          </DialogHeader>
          <GhanaLocationForm />
        </DialogContent>
      </Dialog>

      {/* AI Search Dialog */}
      <Dialog open={showAISearch} onOpenChange={setShowAISearch}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Smart Search</DialogTitle>
            <DialogDescription>
              Search using natural language
            </DialogDescription>
          </DialogHeader>
          <SmartSearch />
        </DialogContent>
      </Dialog>

      {/* Request Delivery Dialog */}
      <Dialog open={showDeliveryRequest} onOpenChange={(open) => {
        setShowDeliveryRequest(open);
        if (!open) setDeliveryContainer(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Delivery</DialogTitle>
            <DialogDescription>
              Choose a delivery partner and enter your delivery details
            </DialogDescription>
          </DialogHeader>
          {deliveryContainer ? (
            <DeliveryPartnerFlow
              containerId={deliveryContainer.id}
              containerNumber={deliveryContainer.container_number}
              totalCBM={0}
              onClose={() => {
                setShowDeliveryRequest(false);
                setDeliveryContainer(null);
              }}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center pb-2">
                Select a container to request delivery
              </p>
              {containers.filter(c => c.status === "arrived" || c.status === "delivered").length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No containers available for delivery. Containers must be in "Arrived" or "Ready" status.</p>
              ) : (
                containers.filter(c => c.status === "arrived" || c.status === "delivered").map((container) => (
                  <button
                    key={container.id}
                    onClick={() => setDeliveryContainer(container)}
                    className="block w-full text-left p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <p className="font-semibold font-mono">{container.container_number}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{container.status}</Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Us Dialog */}
      <Dialog open={showContactUs} onOpenChange={setShowContactUs}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
            <DialogDescription>
              Get in touch with Amoliga Elite Freight & Logistics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <a href="tel:+233307001743" className="text-sm text-muted-foreground hover:text-primary">
                  +233 30 700 1743
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Mobile</p>
                <a href="tel:+233208878817" className="text-sm text-muted-foreground hover:text-primary">
                  +233 20 887 8817
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <a 
                  href="https://wa.me/233208878817" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-green-600"
                >
                  +233 20 887 8817
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a href="mailto:aeflogistics@gmail.com" className="text-sm text-muted-foreground hover:text-primary">
                  aeflogistics@gmail.com
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Abuse Dialog */}
      <Dialog open={showReportAbuse} onOpenChange={setShowReportAbuse}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Abuse</DialogTitle>
            <DialogDescription>
              Report suspicious activity or abuse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you've encountered any fraudulent activity, suspicious behavior, or abuse of our services, 
              please contact us immediately.
            </p>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">Emergency Contact</p>
              <a href="tel:+233208878817" className="text-sm text-destructive hover:underline">
                +233 20 887 8817
              </a>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Email Report</p>
              <a href="mailto:aeflogistics@gmail.com?subject=Abuse%20Report" className="text-sm text-muted-foreground hover:text-primary">
                aeflogistics@gmail.com
              </a>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                window.open("https://wa.me/233208878817?text=I%20want%20to%20report%20an%20issue", "_blank");
                setShowReportAbuse(false);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Report via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goods Selection Dialog */}
      <GoodsSelectionDialog
        open={showGoodsSelection}
        onOpenChange={setShowGoodsSelection}
        onGenerateInvoice={handleGenerateInvoice}
      />

      {/* Invoice Generation Dialog */}
      <InvoiceGenerationDialog
        open={showInvoiceGeneration}
        onOpenChange={setShowInvoiceGeneration}
        selectionData={selectionData}
        containerName={selectedContainerName}
        containerId={selectedContainerId}
      />
    </AppLayout>
  );
}
