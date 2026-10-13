import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatGhs } from "@/lib/pricing";
import { AlertTriangle, CheckCircle, FileCheck2, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";

type PreviewRow = {
  sourceRow: number; sourceReference: string; sourceDate: string; receiptNumber: string;
  customerName: string; customerPhone: string; productName: string; quantity: number;
  cbm: number; weightKg: number; status: string; messages: string[]; estimatedFreight?: number;
};
type Preview = {
  fingerprint: string; filename: string; sheetName: string; rowCount: number; customerGroups: number;
  reviewRows: number; invalidContacts: number; totals: { cartons: number; cbm: number; weightKg: number; estimatedFreight?: number };
  pricing?: { baseRate: number; exchangeRate: number; effectiveRate: number; currency: string };
  customers?: { key: string; customerName: string; customerPhone: string; cbm: number; cartons: number; estimatedFreight: number }[];
  container: { internalNumber: string; shippingNumber: string; sealNumber: string; type: string; loadingDate: string; origin: string; destination: string };
  rows: PreviewRow[];
};

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function invokeImport(body: object) {
  const { data, error } = await supabase.functions.invoke("import-packing-list", { body });
  if (!error) return data;
  const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
  throw new Error(detail?.error || error.message);
}

export function PackingListUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [details, setDetails] = useState({ internalNumber: "", shippingNumber: "", sealNumber: "", type: "", loadingDate: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const containerOverride = () => Object.fromEntries(Object.entries(details).filter(([, value]) => value.trim() !== ""));

  const selectFile = async (selected: File | undefined) => {
    if (!selected) return;
    setBusy(true); setPreview(null); setFile(selected);
    try {
      const encoded = await fileToBase64(selected);
      setFileBase64(encoded);
      const data = await invokeImport({ fileBase64: encoded, filename: selected.name, confirm: false, container: containerOverride() });
      setPreview(data.preview);
      toast({ title: "Validation complete", description: `${data.preview.rowCount} cargo rows are ready for review.` });
    } catch (error) {
      setFile(null); setFileBase64("");
      toast({ title: "Validation failed", description: error instanceof Error ? error.message : "Could not read workbook", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const confirmImport = async () => {
    if (!file || !fileBase64 || !preview) return;
    setBusy(true);
    try {
      const data = await invokeImport({ fileBase64, filename: file.name, confirm: true, sendSms, container: { ...containerOverride(), ...preview.container } });
      const r = data.result;
      toast({ title: "Packing list imported", description: `${r.rows} rows, ${r.cartons} CTN, ${Number(r.cbm).toFixed(5)} CBM and ${Number(r.weightKg).toFixed(4)} KG saved.` });
      setFile(null); setFileBase64(""); setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["packing-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["containers"] }),
        queryClient.invalidateQueries({ queryKey: ["sms-batches"] }),
      ]);
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "No records were changed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Packing List Import</CardTitle>
        <CardDescription>Upload any container's packing list (Excel or CSV). Nothing is saved until you confirm the reviewed preview.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label htmlFor="packing-list-file">Packing list file (.xlsx, .xls or .csv)</Label><Input ref={inputRef} id="packing-list-file" type="file" accept=".xlsx,.xlsm,.xls,.csv" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0])} /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {([["shippingNumber", "Shipping container no."], ["sealNumber", "Seal no."], ["type", "Container type"], ["loadingDate", "Loading date"], ["internalNumber", "AEF container no."]] as const).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`container-${key}`} className="text-xs">{label}</Label>
              <Input id={`container-${key}`} type={key === "loadingDate" ? "date" : "text"} value={details[key]} disabled={busy} placeholder="Auto-detected" onChange={(event) => setDetails((prev) => ({ ...prev, [key]: event.target.value }))} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Container details are read from the file when present. Fill these in only if the file has no container header, or to override it.</p>
        <div className="flex items-center gap-2"><Checkbox id="send-import-sms" checked={sendSms} onCheckedChange={(value) => setSendSms(value === true)} /><Label htmlFor="send-import-sms">Queue one consolidated SMS per valid customer phone</Label></div>
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Validating workbook securely…</p>}
      </CardContent>
    </Card>

    {preview && <>
      <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Duplicate protection active</AlertTitle><AlertDescription>Fingerprint {preview.fingerprint.slice(0, 12)}… prevents this workbook from being imported twice.</AlertDescription></Alert>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Rows', preview.rowCount], ['Cartons', preview.totals.cartons], ['CBM', preview.totals.cbm.toFixed(5)], ['Weight', `${preview.totals.weightKg.toFixed(4)} KG`], ['Est. Freight', formatGhs(preview.totals.estimatedFreight ?? 0, preview.pricing?.currency)], ['Rate / CBM', `${formatGhs(preview.pricing?.effectiveRate ?? 0, preview.pricing?.currency)} (${preview.pricing?.baseRate} × ${preview.pricing?.exchangeRate})`]].map(([label, value]) => <Card key={label}><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />{preview.container.internalNumber}</CardTitle><CardDescription>{preview.container.shippingNumber} · Seal {preview.container.sealNumber} · {preview.container.type} · {preview.container.loadingDate} · {preview.container.origin} → {preview.container.destination}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{preview.customerGroups} customer groups</Badge><Badge variant="outline">{preview.reviewRows} review rows</Badge><Badge variant="outline">{preview.invalidContacts} invalid or missing contacts</Badge></div>
          {preview.reviewRows > 0 && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Review required</AlertTitle><AlertDescription>Rows are preserved exactly, but unsafe phone values will not be converted or notified automatically.</AlertDescription></Alert>}
          <div className="max-h-[520px] overflow-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Status</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Goods</TableHead><TableHead className="text-right">CTN</TableHead><TableHead className="text-right">CBM</TableHead><TableHead className="text-right">KG</TableHead><TableHead className="text-right">Est. Freight</TableHead></TableRow></TableHeader><TableBody>
            {preview.rows.map((row) => <TableRow key={row.sourceRow}><TableCell>{row.sourceRow}</TableCell><TableCell>{row.messages.length ? <Badge variant="destructive">Review</Badge> : <CheckCircle className="h-4 w-4 text-success" />}</TableCell><TableCell>{row.customerName || "—"}</TableCell><TableCell className="font-mono text-xs">{row.customerPhone || "—"}</TableCell><TableCell><p>{row.productName}</p>{row.messages.length > 0 && <p className="text-xs text-destructive">{row.messages.join("; ")}</p>}</TableCell><TableCell className="text-right">{row.quantity}</TableCell><TableCell className="text-right">{row.cbm}</TableCell><TableCell className="text-right">{row.weightKg || "—"}</TableCell><TableCell className="text-right">{formatGhs(row.estimatedFreight ?? 0, preview.pricing?.currency)}</TableCell></TableRow>)}
          </TableBody></Table></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => { setPreview(null); setFile(null); setFileBase64(""); if (inputRef.current) inputRef.current.value = ""; }}>Clear</Button><Button onClick={() => void confirmImport()} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Confirm and Import All {preview.rowCount} Rows</Button></div>
        </CardContent>
      </Card>
    </>}
  </div>;
}