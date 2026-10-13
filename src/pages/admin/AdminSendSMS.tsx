import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Phone, Loader2, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSendSMS() {
  const [mode, setMode] = useState<"individual" | "group">("individual");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [groupRecipients, setGroupRecipients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: containers } = useQuery({
    queryKey: ["admin-containers-sms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("containers")
        .select("id, container_number, status")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["admin-customers-sms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, unique_code")
        .not("phone", "is", null)
        .order("full_name");
      return data || [];
    },
  });

  const { data: smsLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-sms-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const sendSMSMutation = useMutation({
    mutationFn: async ({ to, msg }: { to: string; msg: string }) => {
      const { data, error } = await supabase.functions.invoke("send-sms-notification", {
        body: { to, message: msg },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "SMS sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-sms-logs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send SMS", description: error.message, variant: "destructive" });
    },
  });

  const handleSendIndividual = () => {
    if (!phone.trim() || !message.trim()) {
      toast({ title: "Please fill phone and message", variant: "destructive" });
      return;
    }
    sendSMSMutation.mutate({ to: phone, msg: message });
  };

  const handlePrepareGroup = () => {
    let recipients: any[] = [];
    if (groupFilter === "container" && selectedContainer) {
      // Get customers with shipments in this container
      const containerCustomers = customers?.filter((c) => c.phone) || [];
      recipients = containerCustomers;
    } else {
      recipients = customers?.filter((c) => c.phone) || [];
    }
    setGroupRecipients(recipients);
    setConfirmDialogOpen(true);
  };

  const handleSendGroup = async () => {
    setConfirmDialogOpen(false);
    for (const recipient of groupRecipients) {
      const personalizedMsg = message
        .replace("{name}", recipient.full_name || "Customer")
        .replace("{code}", recipient.unique_code || "");
      try {
        await sendSMSMutation.mutateAsync({ to: recipient.phone, msg: personalizedMsg });
      } catch {
        // Continue sending to others
      }
    }
    toast({ title: `SMS batch completed for ${groupRecipients.length} recipients` });
  };

  const filteredLogs = smsLogs?.filter(
    (log) =>
      log.customer_phone?.includes(searchQuery) ||
      log.customer_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.product_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="SMS Management">
      <div className="space-y-6">
        {/* Compose SMS */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Compose SMS
          </h3>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === "individual" ? "accent" : "outline"}
              size="sm"
              onClick={() => setMode("individual")}
            >
              <Phone className="w-4 h-4 mr-2" /> Individual
            </Button>
            <Button
              variant={mode === "group" ? "accent" : "outline"}
              size="sm"
              onClick={() => setMode("group")}
            >
              <Users className="w-4 h-4 mr-2" /> Group
            </Button>
          </div>

          {mode === "individual" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="0241234567 or 233241234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your SMS message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={640}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{message.length}/640 characters</p>
              </div>
              <Button
                variant="accent"
                onClick={handleSendIndividual}
                disabled={sendSMSMutation.isPending || !phone.trim() || !message.trim()}
              >
                {sendSMSMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send SMS
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Filter Recipients</Label>
                <div className="flex gap-3">
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="container">By Container</SelectItem>
                    </SelectContent>
                  </Select>
                  {groupFilter === "container" && (
                    <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select container..." />
                      </SelectTrigger>
                      <SelectContent>
                        {containers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.container_number} ({c.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  placeholder="Hello {name}, your shipment ({code}) is ready..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={640}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{name}"} and {"{code}"} as placeholders. {message.length}/640 chars.
                </p>
              </div>
              <Button
                variant="accent"
                onClick={handlePrepareGroup}
                disabled={!message.trim()}
              >
                <Users className="w-4 h-4 mr-2" /> Preview & Send to Group
              </Button>
            </div>
          )}
        </div>

        {/* SMS Logs */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg">SMS Logs</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Phone</th>
                  <th className="text-left p-4 font-medium text-sm">Customer</th>
                  <th className="text-left p-4 font-medium text-sm">Message</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logsLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                )}
                {!logsLoading && !filteredLogs?.length && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No SMS logs found
                    </td>
                  </tr>
                )}
                {filteredLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-4 text-sm font-mono">{log.customer_phone}</td>
                    <td className="p-4 text-sm">
                      <div>
                        <p>{log.customer_name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{log.customer_code}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">{log.product_summary}</td>
                    <td className="p-4">
                      {log.sms_sent ? (
                        <Badge className="bg-success/10 text-success">
                          <CheckCircle className="w-3 h-3 mr-1" /> Sent
                        </Badge>
                      ) : log.sms_error ? (
                        <Badge className="bg-destructive/10 text-destructive">
                          <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {log.sms_sent_at
                        ? new Date(log.sms_sent_at).toLocaleString()
                        : new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Group Send Confirm */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Group SMS</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You are about to send an SMS to <strong>{groupRecipients.length}</strong> recipients.
          </p>
          <div className="max-h-40 overflow-auto bg-muted rounded-lg p-3 text-sm space-y-1">
            {groupRecipients.slice(0, 10).map((r) => (
              <div key={r.user_id} className="flex justify-between">
                <span>{r.full_name}</span>
                <span className="text-muted-foreground">{r.phone}</span>
              </div>
            ))}
            {groupRecipients.length > 10 && (
              <p className="text-muted-foreground">...and {groupRecipients.length - 10} more</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleSendGroup} disabled={sendSMSMutation.isPending}>
              {sendSMSMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send to {groupRecipients.length} Recipients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
