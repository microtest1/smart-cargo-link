import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCbmPricing, useCreatePricingRate, usePricingRateHistory } from "@/hooks/useCbmPricing";
import { effectiveCbmRate, formatCbm, formatGhs } from "@/lib/pricing";
import { Loader2, Ship, TrendingUp } from "lucide-react";

type ReportRow = {
  id: string;
  invoice_number: string;
  user_code: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  created_at: string;
  shipment_cbm: number | null;
  base_cbm_rate: number | null;
  exchange_rate: number | null;
  effective_cbm_rate: number | null;
  freight_subtotal: number | null;
  currency: string | null;
  container_id: string | null;
  containers?: { container_number: string } | null;
};

export default function AdminPricing() {
  const { toast } = useToast();
  const { pricing } = useCbmPricing();
  const { data: history = [] } = usePricingRateHistory();
  const createRate = useCreatePricingRate();

  const [baseRate, setBaseRate] = useState(String(pricing.baseRate));
  const [exchangeRate, setExchangeRate] = useState(String(pricing.exchangeRate));
  const [notes, setNotes] = useState("");

  const [containerFilter, setContainerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const previewEffective = effectiveCbmRate(Number(baseRate) || 0, Number(exchangeRate) || 0);

  const { data: report = [], isLoading: reportLoading } = useQuery({
    queryKey: ["admin-pricing-report"],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, user_code, status, total_amount, amount_paid, created_at, shipment_cbm, base_cbm_rate, exchange_rate, effective_cbm_rate, freight_subtotal, currency, container_id, containers(container_number)"
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const containers = useMemo(
    () =>
      Array.from(
        new Set(report.map((r) => r.containers?.container_number).filter(Boolean) as string[])
      ),
    [report]
  );

  const filtered = report.filter((r) => {
    if (containerFilter !== "all" && r.containers?.container_number !== containerFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !`${r.invoice_number} ${r.user_code}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const submit = async () => {
    const base = Number(baseRate);
    const exchange = Number(exchangeRate);
    if (!(base > 0) || !(exchange > 0)) {
      toast({ title: "Invalid rate", description: "Both rates must be greater than zero.", variant: "destructive" });
      return;
    }
    try {
      await createRate.mutateAsync({ baseRate: base, exchangeRate: exchange, notes: notes.trim() || undefined });
      setNotes("");
      toast({
        title: "Rate updated",
        description: `New effective rate: ${formatGhs(base * exchange)} per CBM. Existing finalized and paid invoices are unchanged.`,
      });
    } catch (error) {
      toast({
        title: "Could not update rate",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="CBM Pricing">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Service", "Sea Freight"],
            ["Base Freight Rate", String(pricing.baseRate)],
            ["Conversion Rate", String(pricing.exchangeRate)],
            ["Effective Rate", `${formatGhs(pricing.effectiveRate, pricing.currency)} / CBM`],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Official Sea Freight CBM Rate
              <Badge className="ml-2">ACTIVE</Badge>
            </CardTitle>
            <CardDescription>
              Formula: CBM × base rate × conversion rate. This single configuration drives every
              quote, invoice and payment across the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="base-rate">Base freight rate</Label>
                <Input id="base-rate" type="number" min="0" step="0.01" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">Conversion rate</Label>
                <Input id="exchange-rate" type="number" min="0" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New effective rate</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 font-semibold">
                  {formatGhs(previewEffective)} / CBM
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-notes">Reason for change (optional)</Label>
              <Textarea id="rate-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void submit()} disabled={createRate.isPending}>
                {createRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save New Rate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Previously paid or finalized invoices keep their original stored rate snapshot.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rate History
            </CardTitle>
            <CardDescription>Every rate version with the administrator who set it.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Effective / CBM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{new Date(row.effective_date).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.base_rate}</TableCell>
                      <TableCell className="text-right">{row.exchange_rate}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatGhs(Number(row.effective_rate), row.currency)}
                      </TableCell>
                      <TableCell>
                        {row.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Superseded</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{row.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No rate history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freight & Invoice Report</CardTitle>
            <CardDescription>
              Customer code, container, CBM, rate applied, freight, invoice amount and payment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Search invoice or AEF code" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={containerFilter} onValueChange={setContainerFilter}>
                <SelectTrigger><SelectValue placeholder="Container" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All containers</SelectItem>
                  {containers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Invoice status" /></SelectTrigger>
                <SelectContent>
                  {["all", "pending", "partially_paid", "paid", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>AEF Code</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead className="text-right">CBM</TableHead>
                    <TableHead className="text-right">Rate / CBM</TableHead>
                    <TableHead className="text-right">Freight</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  )}
                  {!reportLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">No invoices match these filters.</TableCell>
                    </TableRow>
                  )}
                  {filtered.map((r) => {
                    const currency = r.currency ?? pricing.currency;
                    const rate = r.effective_cbm_rate ?? pricing.effectiveRate;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                        <TableCell>{r.user_code}</TableCell>
                        <TableCell>{r.containers?.container_number ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.shipment_cbm ? formatCbm(Number(r.shipment_cbm)) : "—"}</TableCell>
                        <TableCell className="text-right">{formatGhs(Number(rate), currency)}</TableCell>
                        <TableCell className="text-right">
                          {r.freight_subtotal ? formatGhs(Number(r.freight_subtotal), currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatGhs(Number(r.total_amount), currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "paid" ? "default" : "outline"}>
                            {r.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
