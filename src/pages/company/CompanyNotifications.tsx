import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Bell,
  Plus,
  Send,
  Package,
  CreditCard,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const notificationTypes = [
  { value: "shipment", label: "Shipment Update", icon: Package },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "support", label: "Support", icon: MessageCircle },
  { value: "announcement", label: "Announcement", icon: Megaphone },
];

const typeColors: Record<string, string> = {
  shipment: "bg-blue-500/10 text-blue-600",
  payment: "bg-green-500/10 text-green-600",
  support: "bg-purple-500/10 text-purple-600",
  announcement: "bg-orange-500/10 text-orange-600",
};

export default function CompanyNotifications() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_code: "",
    type: "shipment",
    title: "",
    message: "",
  });

  // Fetch notifications sent by this company
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["company-notifications", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", session!.companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // user_id is auto-resolved by database trigger from user_code
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_code: data.user_code.trim().toUpperCase(),
          type: data.type,
          title: data.title,
          message: data.message,
          company_id: session!.companyId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-notifications"] });
      toast({
        title: "Notification Sent",
        description: "The notification has been sent to the customer.",
      });
      setIsDialogOpen(false);
      setFormData({ user_code: "", type: "shipment", title: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_code || !formData.title || !formData.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/company-admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-lg">Notifications</h1>
              <p className="text-xs text-muted-foreground">Send updates to your customers</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogDescription>Send a notification to a customer</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Code *</Label>
                  <Input
                    value={formData.user_code}
                    onChange={(e) => setFormData(p => ({ ...p, user_code: e.target.value.toUpperCase() }))}
                    placeholder="AEF_CUSTOMERNAME"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="w-4 h-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Notification title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Enter your message..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications?.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications?.map((notification) => {
              const typeConfig = notificationTypes.find(t => t.value === notification.type);
              const Icon = typeConfig?.icon || Bell;
              
              return (
                <Card key={notification.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        typeColors[notification.type] || "bg-muted"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            To: {notification.user_code}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
