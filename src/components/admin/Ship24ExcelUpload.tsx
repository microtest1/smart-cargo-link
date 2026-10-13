import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle2, Download, AlertCircle, Satellite } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useContainers } from "@/hooks/useContainers";
import * as XLSX from "@e965/xlsx";

interface ParsedRow {
  container_id: string;
  tracking_number: string;
  courier_name: string;
  shipping_mark: string;
  customer_name: string;
  customer_phone: string;
  package_number: number;
  item_description: string;
  quantity: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  cbm: number;
  warehouse_status: string;
  arrival_date: string;
  validation_error?: string;
}

interface UploadResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    errors: number;
    ship24_registered: number;
  };
  results: Array<{
    row_index: number;
    tracking_number: string;
    shipping_mark: string;
    status: string;
    message: string;
    ship24_registered: boolean;
  }>;
}

interface Ship24ExcelUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRACKING_REGEX = /^[A-Za-z0-9\-]{4,50}$/;
const SHIPPING_MARK_REGEX = /^AEF_\d{5}$/;
const CONTAINER_ID_REGEX = /^AEF-CN-\d{4}-\d{2}-\d{3}$/;

export function Ship24ExcelUpload({ open, onOpenChange }: Ship24ExcelUploadProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [uploadStep, setUploadStep] = useState<"select" | "upload" | "preview" | "processing" | "complete">("select");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { containers } = useContainers();

  const normalizeHeader = (h: string): string => {
    return h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  };

  const parseExcel = (data: ArrayBuffer): ParsedRow[] => {
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    return json.map((row) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
      });

      const trackingNumber = String(normalized.tracking_number || normalized.tracking_no || "").trim();
      const shippingMark = String(normalized.shipping_mark || normalized.user_code || normalized.client_code || "").trim().toUpperCase();
      const containerId = String(normalized.container_id || normalized.container_number || "").trim();

      // Validate
      let validationError: string | undefined;
      if (!trackingNumber) validationError = "Missing tracking number";
      else if (!TRACKING_REGEX.test(trackingNumber)) validationError = "Invalid tracking number format";
      else if (shippingMark && !SHIPPING_MARK_REGEX.test(shippingMark)) validationError = `Invalid shipping mark: ${shippingMark}`;
      else if (containerId && !CONTAINER_ID_REGEX.test(containerId) && !selectedContainerId) validationError = `Invalid container ID: ${containerId}`;

      return {
        container_id: containerId,
        tracking_number: trackingNumber,
        courier_name: String(normalized.courier_name || normalized.courier || "").trim(),
        shipping_mark: shippingMark,
        customer_name: String(normalized.customer_name || normalized.client_name || "").trim(),
        customer_phone: String(normalized.customer_phone || normalized.phone || "").trim(),
        package_number: parseInt(normalized.package_number) || 0,
        item_description: String(normalized.item_description || normalized.product || normalized.item_name || "Package").trim(),
        quantity: parseInt(normalized.quantity || normalized.qty) || 1,
        length_cm: parseFloat(normalized.length_cm || normalized.length) || 0,
        width_cm: parseFloat(normalized.width_cm || normalized.width) || 0,
        height_cm: parseFloat(normalized.height_cm || normalized.height) || 0,
        cbm: parseFloat(normalized.cbm || normalized.volume) || 0,
        warehouse_status: String(normalized.warehouse_status || normalized.status || "received").trim(),
        arrival_date: String(normalized.arrival_date || normalized.date || "").trim(),
        validation_error: validationError,
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast({ title: "Invalid file type", description: "Please upload an Excel (.xlsx, .xls) or CSV file", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcel(buffer);

      if (parsed.length === 0) {
        toast({ title: "No data found", description: "The file appears to be empty", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      setParsedData(parsed);
      setUploadStep("preview");
    } catch (error) {
      toast({ title: "Error parsing file", description: "Failed to parse the Excel file", variant: "destructive" });
    }

    setIsProcessing(false);
  };

  const processUpload = async () => {
    setUploadStep("processing");
    setIsProcessing(true);

    try {
      const validRows = parsedData.filter(r => !r.validation_error);

      const { data, error } = await supabase.functions.invoke("process-ship24-excel", {
        body: {
          rows: validRows,
          container_db_id: selectedContainerId || undefined,
        },
      });

      if (error) throw new Error("Failed to process upload");
      if (data?.error) throw new Error(data.error);

      setUploadResult(data as UploadResult);
      setUploadStep("complete");

      queryClient.invalidateQueries({ queryKey: ["container-items"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-submissions"] });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      setUploadStep("preview");
    }

    setIsProcessing(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Container_ID: "AEF-CN-2026-03-001",
        Tracking_Number: "SF02545002336",
        Courier_Name: "SF Express",
        Shipping_Mark: "AEF_00001",
        Customer_Name: "John Doe",
        Customer_Phone: "0241234567",
        Package_Number: 1,
        Item_Description: "Television",
        Quantity: 2,
        Length_cm: 120,
        Width_cm: 80,
        Height_cm: 30,
        CBM: 0.288,
        Warehouse_Status: "received",
        Arrival_Date: "2026-03-05",
      },
      {
        Container_ID: "AEF-CN-2026-03-001",
        Tracking_Number: "YT9876543210",
        Courier_Name: "YTO Express",
        Shipping_Mark: "AEF_00002",
        Customer_Name: "Jane Smith",
        Customer_Phone: "0209876543",
        Package_Number: 2,
        Item_Description: "Electronics",
        Quantity: 5,
        Length_cm: 60,
        Width_cm: 40,
        Height_cm: 30,
        CBM: 0.072,
        Warehouse_Status: "received",
        Arrival_Date: "2026-03-05",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packages");

    // Set column widths
    ws["!cols"] = [
      { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 8 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 16 }, { wch: 12 },
    ];

    XLSX.writeFile(wb, "ship24_package_template.xlsx");
  };

  const resetDialog = () => {
    setParsedData([]);
    setSelectedContainerId("");
    setUploadStep("select");
    setUploadResult(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  const validCount = parsedData.filter(r => !r.validation_error).length;
  const errorCount = parsedData.filter(r => r.validation_error).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-primary" />
            Ship24 Package Upload
          </DialogTitle>
          <DialogDescription>
            Upload packages via Excel — tracking numbers are automatically registered with Ship24 for real-time monitoring
          </DialogDescription>
        </DialogHeader>

        {uploadStep === "select" && (
          <div className="space-y-4">
            <div>
              <Label>Select Container</Label>
              <Select value={selectedContainerId} onValueChange={setSelectedContainerId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a container..." />
                </SelectTrigger>
                <SelectContent>
                  {containers?.map((container) => (
                    <SelectItem key={container.id} value={container.id}>
                      {container.container_number} — {container.status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Or include Container_ID column in your Excel file
              </p>
            </div>
            <Button onClick={() => setUploadStep("upload")} disabled={!selectedContainerId} className="w-full">
              Continue to Upload
            </Button>
          </div>
        )}

        {uploadStep === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Container: {containers?.find(c => c.id === selectedContainerId)?.container_number}</span>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Click to upload Excel file</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Need a template?</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Required Columns:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">Tracking_Number</code> — Courier tracking number</li>
                <li><code className="bg-muted px-1 rounded">Item_Description</code> — Product name</li>
              </ul>
              <h4 className="font-medium mt-3 mb-2">Recommended Columns:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">Container_ID</code> — e.g. AEF-CN-2026-03-001</li>
                <li><code className="bg-muted px-1 rounded">Shipping_Mark</code> — Customer code (AEF_00001)</li>
                <li><code className="bg-muted px-1 rounded">Customer_Name</code> / <code className="bg-muted px-1 rounded">Customer_Phone</code></li>
                <li><code className="bg-muted px-1 rounded">Quantity</code>, <code className="bg-muted px-1 rounded">Length_cm</code>, <code className="bg-muted px-1 rounded">Width_cm</code>, <code className="bg-muted px-1 rounded">Height_cm</code>, <code className="bg-muted px-1 rounded">CBM</code></li>
                <li><code className="bg-muted px-1 rounded">Courier_Name</code>, <code className="bg-muted px-1 rounded">Warehouse_Status</code>, <code className="bg-muted px-1 rounded">Arrival_Date</code></li>
              </ul>
            </div>

            <Button variant="outline" onClick={() => setUploadStep("select")}>Back</Button>
          </div>
        )}

        {uploadStep === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">{parsedData.length} rows found</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {validCount} Valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    {errorCount} Invalid
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Tracking</th>
                    <th className="text-left p-2">Shipping Mark</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">CBM</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, i) => (
                    <tr key={i} className={`border-t ${item.validation_error ? "bg-destructive/5" : ""}`}>
                      <td className="p-2 text-xs">{i + 1}</td>
                      <td className="p-2 font-mono text-xs">{item.tracking_number || "—"}</td>
                      <td className="p-2 font-mono text-xs">{item.shipping_mark || "—"}</td>
                      <td className="p-2 text-xs truncate max-w-[100px]">{item.customer_name || "—"}</td>
                      <td className="p-2 text-xs truncate max-w-[120px]">{item.item_description}</td>
                      <td className="p-2 text-xs">{item.cbm ? item.cbm.toFixed(4) : "—"}</td>
                      <td className="p-2">
                        {item.validation_error ? (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="w-3 h-3" />
                            {item.validation_error}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">Valid</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 inline mr-1 text-destructive" />
                {errorCount} invalid rows will be skipped. {validCount} valid rows will be processed.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetDialog}>Cancel</Button>
              <Button onClick={processUpload} disabled={validCount === 0}>
                <Satellite className="w-4 h-4 mr-2" />
                Process & Register with Ship24 ({validCount} packages)
              </Button>
            </div>
          </div>
        )}

        {uploadStep === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-lg font-medium">Processing packages...</p>
            <p className="text-sm text-muted-foreground">Creating records & registering with Ship24</p>
          </div>
        )}

        {uploadStep === "complete" && uploadResult && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Upload Complete!</h3>

            <div className="flex justify-center gap-4 flex-wrap">
              {uploadResult.summary.created > 0 && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.summary.created}</div>
                  <div className="text-sm">Created</div>
                </div>
              )}
              {uploadResult.summary.updated > 0 && (
                <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.summary.updated}</div>
                  <div className="text-sm">Updated</div>
                </div>
              )}
              {uploadResult.summary.ship24_registered > 0 && (
                <div className="bg-accent/10 text-accent-foreground px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.summary.ship24_registered}</div>
                  <div className="text-sm">Ship24 Registered</div>
                </div>
              )}
              {uploadResult.summary.errors > 0 && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.summary.errors}</div>
                  <div className="text-sm">Errors</div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Ship24 will now automatically monitor all registered tracking numbers. Updates will sync via webhook.
            </p>

            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}

        {isProcessing && uploadStep === "upload" && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
