import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, Building2, Truck, User, UserCheck, TrendingUp, MessageSquare, CheckCircle, XCircle, MapPin, Warehouse, Ship, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFulfillmentStats } from "@/hooks/useOrderFulfillments";
import { ContainerArrivalNotifications } from "@/components/containers/ContainerArrivalNotifications";

export default function AdminDashboard() {
  const { stats: fulfillmentStats, isLoading: fulfillmentLoading } = useFulfillmentStats();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [shipments, profiles, companies, containers] = await Promise.all([
        supabase.from("shipments").select("status", { count: "exact" }),
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("companies").select("*", { count: "exact" }),
        supabase.from("containers").select("status", { count: "exact" }),
      ]);

      const statusCounts = shipments.data?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const containerStatusCounts = containers.data?.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalShipments: shipments.count || 0,
        totalUsers: profiles.count || 0,
        totalCompanies: companies.count || 0,
        totalContainers: containers.count || 0,
        pending: statusCounts["pending"] || 0,
        inTransit: statusCounts["in-transit"] || 0,
        customs: statusCounts["customs"] || 0,
        arrived: statusCounts["arrived"] || 0,
        delivered: statusCounts["delivered"] || 0,
        containerLoading: containerStatusCounts["loading"] || 0,
        containerInTransit: containerStatusCounts["in-transit"] || 0,
        containerArrived: containerStatusCounts["arrived"] || 0,
      };
    },
  });

  const { data: smsStats } = useQuery({
    queryKey: ["admin-sms-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_batches")
        .select("sms_sent, sms_error");
      const sent = data?.filter((s) => s.sms_sent).length || 0;
      const failed = data?.filter((s) => s.sms_error).length || 0;
      const pending = data?.filter((s) => !s.sms_sent && !s.sms_error).length || 0;
      return { sent, failed, pending, total: data?.length || 0 };
    },
  });

  const { data: pendingDeliveries } = useQuery({
    queryKey: ["admin-pending-deliveries"],
    queryFn: async () => {
      const { count } = await supabase
        .from("delivery_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["requested", "pending"]);
      return count || 0;
    },
  });

  const { data: recentWarehouse } = useQuery({
    queryKey: ["admin-recent-warehouse"],
    queryFn: async () => {
      const { data } = await supabase
        .from("warehouse_submissions")
        .select("id, tracking_number, product_name, customer_user_code, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentShipments } = useQuery({
    queryKey: ["recent-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("*, companies(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { label: "Total Shipments", value: stats?.totalShipments || 0, icon: Package, color: "bg-cargo-blue/10 text-cargo-blue" },
    { label: "Active Users", value: stats?.totalUsers || 0, icon: Users, color: "bg-cargo-teal/10 text-cargo-teal" },
    { label: "Companies", value: stats?.totalCompanies || 0, icon: Building2, color: "bg-cargo-orange/10 text-cargo-orange" },
    { label: "Containers", value: stats?.totalContainers || 0, icon: Package, color: "bg-primary/10 text-primary" },
    { label: "In Transit", value: stats?.inTransit || 0, icon: Truck, color: "bg-success/10 text-success" },
    { label: "Pending Deliveries", value: pendingDeliveries || 0, icon: MapPin, color: "bg-warning/10 text-warning" },
  ];

  const fulfillmentCards = [
    { label: "Self Pickups", value: fulfillmentStats.selfPickup, icon: User, color: "bg-primary/10 text-primary" },
    { label: "Deliveries", value: fulfillmentStats.delivery, icon: Truck, color: "bg-accent/10 text-accent" },
    { label: "Third-Party Pickups", value: fulfillmentStats.thirdPartyPickup, icon: UserCheck, color: "bg-warning/10 text-warning" },
  ];

  const statusCards = [
    { label: "Pending", value: stats?.pending || 0, color: "bg-muted" },
    { label: "In Transit", value: stats?.inTransit || 0, color: "bg-cargo-blue/20" },
    { label: "Customs", value: stats?.customs || 0, color: "bg-warning/20" },
    { label: "Arrived", value: stats?.arrived || 0, color: "bg-cargo-teal/20" },
    { label: "Delivered", value: stats?.delivered || 0, color: "bg-success/20" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Primary action: China Warehouse Updates */}
        <Link to="/admin/china-warehouse-updates" className="block">
          <div className="bg-accent/10 border border-accent/30 rounded-2xl p-5 shadow-card flex items-center gap-4 hover:bg-accent/20 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
              <Warehouse className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-lg">China Warehouse Updates</p>
              <p className="text-sm text-muted-foreground">
                Add a new customer's contact and goods details to instantly SMS them that their goods arrived in China.
              </p>
            </div>
            <Button variant="accent" className="shrink-0">
              Open <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="font-display font-bold text-3xl mb-1">{isLoading ? "..." : stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* SMS Stats + Container Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SMS Stats */}
          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> SMS Overview
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-success/10 text-success text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-2xl">{smsStats?.sent || 0}</p>
                <p className="text-xs">Sent</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-center">
                <XCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-2xl">{smsStats?.failed || 0}</p>
                <p className="text-xs">Failed</p>
              </div>
              <div className="p-3 rounded-xl bg-muted text-muted-foreground text-center">
                <MessageSquare className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-2xl">{smsStats?.pending || 0}</p>
                <p className="text-xs">Pending</p>
              </div>
            </div>
          </div>

          {/* Container Status */}
          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" /> Container Status
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-cargo-blue/10 text-center">
                <p className="font-bold text-2xl">{stats?.containerLoading || 0}</p>
                <p className="text-xs text-muted-foreground">Loading</p>
              </div>
              <div className="p-3 rounded-xl bg-cargo-orange/10 text-center">
                <p className="font-bold text-2xl">{stats?.containerInTransit || 0}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-center">
                <p className="font-bold text-2xl">{stats?.containerArrived || 0}</p>
                <p className="text-xs text-muted-foreground">Arrived</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Statistics */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Fulfillment Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {fulfillmentCards.map((stat) => (
              <div key={stat.label} className={cn("p-4 rounded-xl", stat.color)}>
                <stat.icon className="w-8 h-8 mb-2" />
                <p className="font-bold text-2xl">{fulfillmentLoading ? "..." : stat.value}</p>
                <p className="text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold text-lg mb-4">Shipment Status Overview</h3>
          <div className="flex flex-wrap gap-3">
            {statusCards.map((status) => (
              <div key={status.label} className={cn("px-4 py-2 rounded-xl", status.color)}>
                <span className="font-bold text-lg">{status.value}</span>
                <span className="text-sm ml-2">{status.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Container Arrival Notifications */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <ContainerArrivalNotifications />
        </div>

        {/* Recent Warehouse Submissions + Recent Shipments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Warehouse */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Warehouse className="w-5 h-5" /> Recent Warehouse Submissions
              </h3>
            </div>
            <div className="divide-y divide-border">
              {!recentWarehouse?.length && (
                <div className="p-8 text-center text-muted-foreground">No recent submissions.</div>
              )}
              {recentWarehouse?.map((sub) => (
                <div key={sub.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cargo-teal/10 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-5 h-5 text-cargo-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{sub.tracking_number}</p>
                    <p className="text-sm text-muted-foreground truncate">{sub.product_name} • {sub.customer_user_code}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                    sub.status === "received" && "bg-success/10 text-success",
                    sub.status === "pending" && "bg-muted text-muted-foreground"
                  )}>{sub.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Shipments */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold text-lg">Recent Shipments</h3>
            </div>
            <div className="divide-y divide-border">
              {recentShipments?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No shipments yet.</div>
              )}
              {recentShipments?.map((shipment) => (
                <div key={shipment.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{shipment.tracking_number}</p>
                    <p className="text-sm text-muted-foreground truncate">{shipment.product} • {shipment.user_code}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                    shipment.status === "delivered" && "bg-success/10 text-success",
                    shipment.status === "in-transit" && "bg-cargo-blue/10 text-cargo-blue",
                    shipment.status === "pending" && "bg-muted text-muted-foreground"
                  )}>{shipment.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
