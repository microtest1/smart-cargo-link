import { useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  MessageSquare,
} from "lucide-react";

const SITE_URL = "https://www.amoligaelitegroupltd.com";
const USSD_CODE = "*713*12345#";


function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "233" + digits.slice(1);
  if (digits.length === 9) digits = "233" + digits;
  return digits;
}

function isValidPhone(input: string) {
  const p = normalizePhone(input);
  return p.length >= 11 && p.length <= 15;
}

interface FormState {
  full_name: string;
  phone: string;
  tracking_number: string;
  product_description: string;
  cbm: string;
  weight_kg: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  phone: "",
  tracking_number: "",
  product_description: "",
  cbm: "",
  weight_kg: "",
  notes: "",
};

function buildMessage(form: FormState) {
  const name = form.full_name.trim() || "Valued Customer";
  const goods = form.product_description.trim();
  const tracking = form.tracking_number.trim();

  const details: string[] = [];
  if (goods) details.push(`Item: ${goods}`);
  if (tracking) details.push(`Tracking: ${tracking}`);
  if (form.cbm.trim()) details.push(`CBM: ${form.cbm.trim()}`);
  if (form.weight_kg.trim()) details.push(`Weight: ${form.weight_kg.trim()}kg`);

  const lines: string[] = [
    `AMOLIGA ELITE FREIGHT & LOGISTICS`,
    `Hello ${name}, your goods have been received and recorded at our China warehouse.`,
  ];
  if (details.length) lines.push(details.join(" | "));
  lines.push(
    `NEXT STEPS:`,
    `1. Create your free account on ${SITE_URL} to track your goods from China to Ghana, view CBM and invoices.`,
    `2. No internet? Dial ${USSD_CODE} to track your shipment, check your balance and pay with mobile money.`,
    `Thank you for shipping with Amoliga Elite Freight & Logistics.`
  );
  return lines.join("\n");
}



export default function AdminNewClientSMS() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [customMessage, setCustomMessage] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const message = useCustom ? customMessage : buildMessage(form);

  const { data: records, isLoading } = useQuery({
    queryKey: ["new-client-sms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_client_sms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const phone = normalizePhone(form.phone);
      const { data: userData } = await supabase.auth.getUser();

      const { data: inserted, error: insertError } = await supabase
        .from("new_client_sms")
        .insert({
          full_name: form.full_name.trim(),
          phone,
          tracking_number: form.tracking_number.trim() || null,
          product_description: form.product_description.trim() || null,
          cbm: form.cbm ? Number(form.cbm) : null,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
          notes: form.notes.trim() || null,
          message_sent: message,
          created_by: userData?.user?.id ?? null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke("send-sms-notification", {
        body: { to: phone, message },
      });

      const failure = error?.message || (data as any)?.error;
      if (failure) {
        await supabase
          .from("new_client_sms")
          .update({ sms_sent: false, sms_error: String(failure).slice(0, 500) })
          .eq("id", inserted.id);
        throw new Error(String(failure));
      }

      await supabase
        .from("new_client_sms")
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
          sms_message_id: (data as any)?.messageId ?? null,
          sms_error: null,
        })
        .eq("id", inserted.id);

      return data;
    },
    onSuccess: () => {
      toast({ title: "SMS sent to new client" });
      setForm(EMPTY_FORM);
      setCustomMessage("");
      setUseCustom(false);
      queryClient.invalidateQueries({ queryKey: ["new-client-sms"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send SMS", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["new-client-sms"] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.functions.invoke("send-sms-notification", {
        body: { to: record.phone, message: record.message_sent },
      });
      const failure = error?.message || (data as any)?.error;
      if (failure) {
        await supabase
          .from("new_client_sms")
          .update({ sms_sent: false, sms_error: String(failure).slice(0, 500) })
          .eq("id", record.id);
        throw new Error(String(failure));
      }
      await supabase
        .from("new_client_sms")
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
          sms_message_id: (data as any)?.messageId ?? null,
          sms_error: null,
        })
        .eq("id", record.id);
    },
    onSuccess: () => {
      toast({ title: "SMS resent" });
      queryClient.invalidateQueries({ queryKey: ["new-client-sms"] });
    },
    onError: (error: Error) =>
      toast({ title: "Resend failed", description: error.message, variant: "destructive" }),
  });

  const filtered = useMemo(
    () =>
      records?.filter(
        (r) =>
          !search ||
          r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.phone?.includes(search) ||
          r.tracking_number?.toLowerCase().includes(search.toLowerCase())
      ),
    [records, search]
  );

  const canSend =
    form.full_name.trim().length > 1 && isValidPhone(form.phone) && message.trim().length > 10;

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AdminLayout title="China Warehouse Updates">
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
          <h3 className="font-display font-semibold text-lg mb-1 flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Customer &amp; Shipment Details
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture the client's details and notify them that their goods arrived at the China warehouse.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client Full Name *</Label>
              <Input placeholder="Kwame Mensah" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="0241234567 or 233241234567"
                value={form.phone}
                onChange={set("phone")}
              />
              {form.phone && (
                <p className="text-xs text-muted-foreground">
                  Will send to: {normalizePhone(form.phone)}
                  {!isValidPhone(form.phone) && " (invalid)"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input placeholder="SF1234567890" value={form.tracking_number} onChange={set("tracking_number")} />
            </div>
            <div className="space-y-2">
              <Label>Goods / Product</Label>
              <Input placeholder="2 cartons of shoes" value={form.product_description} onChange={set("product_description")} />
            </div>
            <div className="space-y-2">
              <Label>CBM</Label>
              <Input type="number" step="0.001" placeholder="0.85" value={form.cbm} onChange={set("cbm")} />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" placeholder="25" value={form.weight_kg} onChange={set("weight_kg")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Internal Notes</Label>
              <Textarea rows={2} placeholder="Optional notes for admin records" value={form.notes} onChange={set("notes")} />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Message Preview
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!useCustom) setCustomMessage(buildMessage(form));
                  setUseCustom(!useCustom);
                }}
              >
                {useCustom ? "Use auto template" : "Customize message"}
              </Button>
            </div>
            <Textarea
              rows={5}
              maxLength={640}
              value={message}
              readOnly={!useCustom}
              onChange={(e) => setCustomMessage(e.target.value)}
              className={!useCustom ? "bg-muted/50" : undefined}
            />
            <p className="text-xs text-muted-foreground">{message.length}/640 characters</p>
          </div>

          <Button
            variant="accent"
            className="mt-4"
            onClick={() => sendMutation.mutate()}
            disabled={!canSend || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send China Warehouse Update
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-display font-semibold text-lg">China Warehouse Update History</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, tracking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Client</th>
                  <th className="text-left p-4 font-medium text-sm">Goods</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Sent</th>
                  <th className="text-left p-4 font-medium text-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                )}
                {!isLoading && !filtered?.length && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No China warehouse updates sent yet
                    </td>
                  </tr>
                )}
                {filtered?.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 align-top">
                    <td className="p-4 text-sm">
                      <p className="font-medium">{r.full_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{r.phone}</p>
                    </td>
                    <td className="p-4 text-sm">
                      <p>{r.product_description || "-"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.tracking_number || ""}</p>
                    </td>
                    <td className="p-4">
                      {r.sms_sent ? (
                        <Badge className="bg-success/10 text-success">
                          <CheckCircle className="w-3 h-3 mr-1" /> Sent
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/10 text-destructive">
                          <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                      {r.sms_error && (
                        <p className="text-xs text-destructive mt-1 max-w-[16rem]">{r.sms_error}</p>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.sms_sent_at || r.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendMutation.mutate(r)}
                        disabled={resendMutation.isPending}
                      >
                        Resend
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
