import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Calculator,
  Package, 
  LayoutDashboard, 
  Truck, 
  Building2, 
  Bell, 
  Users, 
  LogOut,
  Menu,
  X,
  CreditCard,
  Warehouse,
  UserPlus,
  MessageSquare,
  ClipboardList,
  CheckCircle,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { icon: Warehouse, label: "China Warehouse Updates", path: "/admin/china-warehouse-updates" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Truck, label: "Shipments", path: "/admin/shipments" },
  { icon: Building2, label: "Companies", path: "/admin/companies" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: Package, label: "Containers", path: "/admin/containers" },
  { icon: Users, label: "Company Admins", path: "/admin/company-admins" },
  { icon: CreditCard, label: "Payments", path: "/admin/payments" },
  { icon: Calculator, label: "CBM Pricing", path: "/admin/pricing" },
  { icon: Warehouse, label: "Warehouse", path: "/admin/warehouse" },
  { icon: Package, label: "Packing Lists", path: "/admin/packing-lists" },
  { icon: UserPlus, label: "Manual Entry", path: "/admin/manual-entry" },
  { icon: MessageSquare, label: "SMS Management", path: "/admin/sms" },
  { icon: CheckCircle, label: "Warehouse Confirm", path: "/admin/warehouse-confirmation" },
  { icon: MapPin, label: "Delivery Orders", path: "/admin/delivery-requests" },
  { icon: AlertTriangle, label: "Warehouse Alerts", path: "/admin/warehouse-alerts" },
  { icon: ClipboardList, label: "Audit Logs", path: "/admin/audit-logs" },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, isManager, isLoading, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && !isManager) {
      navigate("/dashboard");
    }
  }, [isManager, isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !isManager) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                  <Package className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <span className="font-display font-bold text-lg">Admin</span>
                  <p className="text-xs text-muted-foreground">Amoliga Elite</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {profile?.full_name?.charAt(0) || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{profile?.full_name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">{title}</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
