import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Package,
  Bell,
  Truck,
  LogOut,
  MapPin,
  Settings,
  LayoutDashboard,
  Users,
  Container,
  MessageSquare,
  CreditCard,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompanyAdminDashboard() {
  const { session, logout } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ["company", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", session!.companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Fetch shipment stats
  const { data: shipmentStats } = useQuery({
    queryKey: ["company-shipment-stats", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("status")
        .eq("company_id", session!.companyId);
      if (error) throw error;
      
      const stats = {
        total: data.length,
        pending: data.filter(s => s.status === "pending").length,
        inTransit: data.filter(s => s.status === "in-transit").length,
        delivered: data.filter(s => s.status === "delivered").length,
      };
      return stats;
    },
    enabled: !!session?.companyId,
  });

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Signed Out",
      description: "You have been logged out successfully",
    });
    navigate("/company-login");
  };

  const menuItems = [
    { icon: Warehouse, label: "China Warehouse Updates", path: "/company-admin/china-warehouse-updates" },
    { icon: LayoutDashboard, label: "Dashboard", path: "/company-admin", active: true },
    { icon: Package, label: "Shipments", path: "/company-admin/shipments" },
    { icon: Container, label: "Containers", path: "/company-admin/containers" },
    { icon: Users, label: "Customers", path: "/company-admin/customers" },
    { icon: Bell, label: "Notifications", path: "/company-admin/notifications" },
    { icon: MessageSquare, label: "Support", path: "/company-admin/support" },
    { icon: CreditCard, label: "Payments", path: "/company-admin/payments" },
    { icon: Settings, label: "Company Settings", path: "/company-admin/settings" },
  ];

  const statCards = [
    { label: "Total Shipments", value: shipmentStats?.total || 0, icon: Package, color: "bg-blue-500" },
    { label: "Pending", value: shipmentStats?.pending || 0, icon: Package, color: "bg-yellow-500" },
    { label: "In Transit", value: shipmentStats?.inTransit || 0, icon: Truck, color: "bg-orange-500" },
    { label: "Delivered", value: shipmentStats?.delivered || 0, icon: Package, color: "bg-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">{session?.companyName}</h1>
              <p className="text-xs text-muted-foreground">Company Admin Portal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                        item.active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9 space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-display font-bold mb-2">
                  Welcome back! 👋
                </h2>
                <p className="text-muted-foreground">
                  Manage your shipments, customers, and company settings from this dashboard.
                </p>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Your company details and addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="font-medium text-sm">China Warehouse</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {company?.china_warehouse_address || "Not set"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="font-medium text-sm">Ghana Warehouse</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {company?.ghana_warehouse_address || "Not set"}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/company-admin/settings")}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Update Company Settings
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/company-admin/shipments")}
              >
                <CardContent className="p-6 text-center">
                  <Package className="w-10 h-10 text-accent mx-auto mb-3" />
                  <h3 className="font-semibold">View Shipments</h3>
                  <p className="text-xs text-muted-foreground mt-1">Manage all company shipments</p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/company-admin/notifications")}
              >
                <CardContent className="p-6 text-center">
                  <Bell className="w-10 h-10 text-accent mx-auto mb-3" />
                  <h3 className="font-semibold">Send Notification</h3>
                  <p className="text-xs text-muted-foreground mt-1">Notify your customers</p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
