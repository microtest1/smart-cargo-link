import { AppLayout } from "@/components/layout/AppLayout";
import { UserCodeCard } from "@/components/dashboard/UserCodeCard";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { ShipmentCard } from "@/components/tracking/ShipmentCard";
import { CustomerWarehouseUpdates } from "@/components/tracking/CustomerWarehouseUpdates";
import { ChinaWarehouseInfo } from "@/components/warehouse/ChinaWarehouseInfo";
import { ContainerArrivalNotifications } from "@/components/containers/ContainerArrivalNotifications";
import { ContainerLoginBanner } from "@/components/containers/ContainerLoginBanner";
import { NewClientWarehouseAlert } from "@/components/warehouse/NewClientWarehouseAlert";
import { Search, Filter, Plus, Package, Truck, Ship, MapPin, Receipt, Warehouse, Loader2 } from "lucide-react";
import { BuyYuanButton } from "@/components/services/BuyYuanButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShipments } from "@/hooks/useShipments";
import { useContainers } from "@/hooks/useContainers";
import { format } from "date-fns";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  const { shipments, isLoading: shipmentsLoading } = useShipments();
  const { containers, isLoading: containersLoading } = useContainers();

  const isLoading = authLoading || shipmentsLoading;

  const filteredShipments = shipments.filter(
    (s) =>
      s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats from real data
  const stats = {
    active: shipments.filter((s) => ["in-transit", "customs", "arrived"].includes(s.status)).length,
    pending: shipments.filter((s) => s.status === "pending").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
    total: shipments.length,
  };

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AppLayout title="Dashboard" showSearch>
      <div className="px-4 py-5 space-y-6">
        {/* Container Login Banner */}
        <ContainerLoginBanner />

        {/* China warehouse goods-received notices for new clients */}
        <NewClientWarehouseAlert />

        {/* User Code Card */}
        <UserCodeCard 
          code={profile?.unique_code || "Loading..."} 
          name={profile?.full_name || "User"} 
        />

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-1">
              <Warehouse className="w-4 h-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Address
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Container Arrival Notifications */}
            <section className="bg-card rounded-2xl border border-border/50 p-4">
              <ContainerArrivalNotifications compact maxItems={5} />
            </section>

            {/* Active Containers */}
            <section>
              <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                <Ship className="w-5 h-5 text-primary" />
                Active Containers
              </h2>
              {containersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : containers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Ship className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No active containers</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {containers.slice(0, 5).map((c) => (
                    <Card
                      key={c.id}
                      className="hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/containers/${c.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold">{c.container_number}</p>
                            <p className="text-xs text-muted-foreground">China Warehouse → Ghana</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                              c.status === 'loading' ? 'bg-green-100 text-green-700' :
                              c.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                              c.status === 'arrived' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {c.status === 'loading' ? 'Loading' :
                               c.status === 'in_transit' ? 'In Transit' :
                               c.status === 'arrived' ? 'Arrived' :
                               c.status === 'delivered' ? 'Ready' : c.status}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">{c.current_load} packages</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Buy Yuan Service */}
            <BuyYuanButton />

            {/* Quick Stats */}
            <QuickStats stats={stats} />

            {/* Quick Actions */}
            <section>
              <h2 className="font-display font-bold text-lg mb-3">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-3">
                <Link to="/my-cargo">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs font-medium">My Cargo</span>
                    </CardContent>
                  </Card>
                </Link>
                <Link to="/invoices">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                        <Receipt className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-xs font-medium">Invoices</span>
                    </CardContent>
                  </Card>
                </Link>
                <Link to="/my-cargo?tab=containers">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-cargo-blue/10 flex items-center justify-center mb-2">
                        <Ship className="w-5 h-5 text-cargo-blue" />
                      </div>
                      <span className="text-xs font-medium">Containers</span>
                    </CardContent>
                  </Card>
                </Link>
                <button onClick={() => setActiveTab("tracking")}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-cargo-teal/10 flex items-center justify-center mb-2">
                        <Warehouse className="w-5 h-5 text-cargo-teal" />
                      </div>
                      <span className="text-xs font-medium">Tracking</span>
                    </CardContent>
                  </Card>
                </button>
              </div>
            </section>

            {/* Shipments Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">My Shipments</h2>
                <Button variant="accent" size="sm" onClick={() => navigate("/shipments")}>
                  <Plus className="w-4 h-4 mr-1" />
                  View All
                </Button>
              </div>

              {/* Search */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shipments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground">Loading shipments...</p>
                </div>
              )}

              {/* Shipment List */}
              {!isLoading && (
                <div className="space-y-4">
                  {filteredShipments.slice(0, 5).map((shipment) => (
                    <ShipmentCard
                      key={shipment.id}
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
                  ))}
                </div>
              )}

              {!isLoading && filteredShipments.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">No shipments found</p>
                  <p className="text-sm text-muted-foreground">
                    Your shipments will appear here once created by admin
                  </p>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="tracking" className="mt-0">
            <CustomerWarehouseUpdates />
          </TabsContent>

          <TabsContent value="warehouse" className="mt-0">
            <ChinaWarehouseInfo 
              userCode={profile?.unique_code || undefined} 
              userName={profile?.full_name || undefined} 
              userPhone={profile?.phone || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
