import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  QrCode, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  CreditCard,
  Bell,
  Shield,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const menuItems = [
  { icon: CreditCard, label: "Payment Methods", path: "/payments" },
  { icon: Bell, label: "Notification Settings", path: "/notification-settings" },
  { icon: Shield, label: "Security", path: "/security" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: HelpCircle, label: "Help & Support", path: "/support" },
  { icon: Settings, label: "App Settings", path: "/settings" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-5 space-y-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {profile?.full_name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="font-display font-bold text-xl">{profile?.full_name || "User"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
            </div>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{profile?.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{profile?.phone || "No phone"}</span>
            </div>
          </div>
        </div>

        {/* Unique Code */}
        <div className="gradient-accent rounded-2xl p-5 text-accent-foreground">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <p className="text-accent-foreground/70 text-xs">Your Unique Code</p>
              <p className="font-display font-bold text-2xl tracking-wider">
                {profile?.unique_code || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                index !== menuItems.length - 1 && "border-b border-border/50"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
              Signing out...
            </span>
          ) : (
            <>
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </>
          )}
        </Button>

        {/* Version */}
        <p className="text-xs text-center text-muted-foreground">
          Amoliga Elite Freight v1.0.0
        </p>
      </div>
    </AppLayout>
  );
}
