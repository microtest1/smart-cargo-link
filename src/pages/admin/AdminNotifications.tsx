import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Bell, Megaphone, Package, CreditCard, MessageCircle, Trash2, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const notificationTypes = [
  { value: "shipment", label: "Shipment Update", icon: Package },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "support", label: "Support", icon: MessageCircle },
  { value: "announcement", label: "Announcement", icon: Megaphone },
];

interface NotificationForm {
  type: string;
  title: string;
  message: string;
  user_code: string;
  company_id: string;
}

const initialForm: NotificationForm = {
  type: "announcement",
  title: "",
  message: "",
  user_code: "",
  company_id: "",
};

export default function AdminNotifications() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<NotificationForm>(initialForm);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, companies(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NotificationForm) => {
      // If user_code is provided, find the user_id
      let user_id = null;
      if (data.user_code) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("unique_code", data.user_code)
          .maybeSingle();
        user_id = profile?.user_id || null;
      }

      const { error } = await supabase.from("notifications").insert({
        type: data.type,
        title: data.title,
        message: data.message,
        user_code: data.user_code || null,
        user_id: user_id,
        company_id: data.company_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "Notification sent successfully" });
      setIsDialogOpen(false);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast({ title: "Error sending notification", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Note: RLS doesn't allow delete, but admin can use service role if needed
      // For now, we'll try and handle error gracefully
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "Notification deleted" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Cannot delete notification", 
        description: "Notifications are read-only after creation for audit purposes.",
        variant: "destructive" 
      });
      setDeleteId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const getTypeIcon = (type: string) => {
    const found = notificationTypes.find((t) => t.value === type);
    return found?.icon || Bell;
  };

  const filteredNotifications = notifications?.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.user_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <p className="text-muted-foreground">
            Send notifications to customers about shipments, payments, or announcements
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => setForm((p) => ({ ...p, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Notification title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Notification message..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>User Code (optional - leave empty for broadcast)</Label>
                    <Input
                      value={form.user_code}
                      onChange={(e) => setForm((p) => ({ ...p, user_code: e.target.value }))}
                      placeholder="AEF_CUSTOMERNAME"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Company (optional)</Label>
                    <Select
                      value={form.company_id}
                      onValueChange={(value) => setForm((p) => ({ ...p, company_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Companies</SelectItem>
                        {companies?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="accent" className="flex-1" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Notification
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Notifications</h3>
            <Badge variant="outline">{filteredNotifications?.length || 0} total</Badge>
          </div>
          <div className="divide-y divide-border">
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            )}
            {!isLoading && filteredNotifications?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No notifications found
              </div>
            )}
            {filteredNotifications?.map((notification) => {
              const Icon = getTypeIcon(notification.type);
              return (
                <div key={notification.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    notification.type === "shipment" && "bg-cargo-blue/10 text-cargo-blue",
                    notification.type === "payment" && "bg-cargo-gold/10 text-cargo-gold",
                    notification.type === "support" && "bg-cargo-teal/10 text-cargo-teal",
                    notification.type === "announcement" && "bg-accent/10 text-accent"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {notification.type}
                      </Badge>
                      {notification.user_code && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                          {notification.user_code}
                        </span>
                      )}
                      {!notification.read && (
                        <Badge className="bg-cargo-blue/10 text-cargo-blue text-xs">Unread</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                      {(notification as any).companies?.name && (
                        <span> • {(notification as any).companies.name}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(notification.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}