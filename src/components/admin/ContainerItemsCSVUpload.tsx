import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle2, Download, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useContainers } from "@/hooks/useContainers";

interface ParsedContainerItem {
  user_code: string;
  client_name: string;
  tracking_number: string;
  item_name: string;
  length: number;
  width: number;
  height: number;
  total_cbm: number;
  quantity?: number;
  carton_count?: number;
  notes?: string;
  isNew?: boolean;
  error?: string;
}

interface ContainerItemsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContainerItemsCSVUpload({ open, onOpenChange }: ContainerItemsCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedContainerItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [uploadStep, setUploadStep] = useState<"select" | "upload" | "preview" | "complete">("select");
  const [results, setResults] = useState<{ created: number; updated: number; errors: number }>({ created: 0, updated: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { containers } = useContainers();

  const parseCSV = (text: string): ParsedContainerItem[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const data: ParsedContainerItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        // Client code / User code
        if (header === 'user_code' || header === 'client_code' || header === 'client code' || header === 'customer_code') {
          row.user_code = value;
        }
        // Client name
        else if (header === 'client_name' || header === 'client name' || header === 'customer_name' || header === 'customer name' || header === 'name') {
          row.client_name = value;
        }
        // Tracking number
        else if (header === 'tracking_number' || header === 'tracking number' || header === 'tracking' || header === 'track_no' || header === 'tracking numbers') {
          row.tracking_number = value;
        }
        // Item name / Product name
        else if (header === 'item_name' || header === 'item name' || header === 'product' || header === 'product_name' || header === 'name of product') {
          row.item_name = value;
        }
        // Length
        else if (header === 'length' || header === 'l') {
          row.length = parseFloat(value) || 0;
        }
        // Width
        else if (header === 'width' || header === 'w') {
          row.width = parseFloat(value) || 0;
        }
        // Height
        else if (header === 'height' || header === 'h') {
          row.height = parseFloat(value) || 0;
        }
        // Total CBM (can be calculated or provided)
        else if (header === 'total_cbm' || header === 'cbm' || header === 'volume') {
          row.total_cbm = parseFloat(value) || 0;
        }
        // Quantity
        else if (header === 'quantity' || header === 'qty') {
          row.quantity = parseInt(value) || 1;
        }
        // Carton count
        else if (header === 'carton_count' || header === 'cartons' || header === 'ctn') {
          row.carton_count = parseInt(value) || 1;
        }
        // Notes
        else if (header === 'notes' || header === 'remarks') {
          row.notes = value;
        }
      });

      // Calculate CBM if dimensions provided but CBM not
      if (row.length && row.width && row.height && !row.total_cbm) {
        row.total_cbm = (row.length * row.width * row.height) / 1000000;
      }

      // Require at least user_code and item_name
      if (row.user_code && row.item_name) {
        data.push({
          user_code: row.user_code,
          client_name: row.client_name || '',
          tracking_number: row.tracking_number || row.user_code, // Default to user_code if no tracking
          item_name: row.item_name,
          length: row.length || 0,
          width: row.width || 0,
          height: row.height || 0,
          total_cbm: row.total_cbm || 0,
          quantity: row.quantity || 1,
          carton_count: row.carton_count || 1,
          notes: row.notes,
        });
      }
    }

    return data;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast({
          title: "No data found",
          description: "The CSV file appears to be empty or missing required columns (client_code, item_name)",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Check which items already exist based on user_code + item_name combination
      const { data: existing } = await (supabase
        .from("container_items" as any)
        .select("user_code, item_name")
        .eq("container_id", selectedContainerId) as any);

      const existingSet = new Set(
        existing?.map((e: any) => `${e.user_code}-${e.item_name}`) || []
      );
      
      const validated = parsed.map(p => ({
        ...p,
        isNew: !existingSet.has(`${p.user_code}-${p.item_name}`),
      }));

      setParsedData(validated);
      setUploadStep("preview");
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Failed to parse the CSV file",
        variant: "destructive",
      });
    }
    
    setIsProcessing(false);
  };

  const processUpload = async () => {
    if (!selectedContainerId) {
      toast({
        title: "No container selected",
        description: "Please select a container first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const item of parsedData) {
      try {
        const clientInfo = item.client_name ? `Client: ${item.client_name}. ` : '';
        const itemData: any = {
          container_id: selectedContainerId,
          user_code: item.user_code,
          item_name: item.item_name,
          total_cbm: item.total_cbm,
          quantity: item.quantity || 1,
          available_quantity: item.quantity || 1,
          carton_count: item.carton_count || 1,
          notes: item.notes 
            ? `${clientInfo}Tracking: ${item.tracking_number}. Dimensions: ${item.length}×${item.width}×${item.height}cm. ${item.notes}` 
            : `${clientInfo}Tracking: ${item.tracking_number}. Dimensions: ${item.length}×${item.width}×${item.height}cm`,
        };

        if (item.isNew) {
          const { error } = await (supabase
            .from("container_items" as any)
            .insert([itemData]) as any);
          
          if (error) throw error;
          created++;
        } else {
          // Update existing item
          const { error } = await (supabase
            .from("container_items" as any)
            .update({
              total_cbm: item.total_cbm,
              quantity: item.quantity,
              available_quantity: item.quantity,
              carton_count: item.carton_count,
              notes: itemData.notes,
            })
            .eq("container_id", selectedContainerId)
            .eq("user_code", item.user_code)
            .eq("item_name", item.item_name) as any);
          
          if (error) throw error;
          updated++;
        }
      } catch (error) {
        console.error(`Error processing ${item.user_code} - ${item.item_name}:`, error);
        errors++;
      }
    }

    setResults({ created, updated, errors });
    setUploadStep("complete");
    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["container-items"] });
  };

  const downloadTemplate = () => {
    const template = `client_code,client_name,tracking_number,item_name,length,width,height,total_cbm,quantity,carton_count,notes
AEF_JOHNDOE,John Doe,TRK-001,Electronics Box,60,40,30,0.072,10,5,Fragile items
AEF_JANESMITH,Jane Smith,TRK-002,Clothing Bundle,50,50,40,0.1,20,10,Textile goods
AEF_KWAMEASANTE,Kwame Asante,TRK-003,Auto Parts,80,60,50,0.24,5,3,Heavy machinery parts`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'container_items_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setSelectedContainerId("");
    setUploadStep("select");
    setResults({ created: 0, updated: 0, errors: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bulk Upload Container Items
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with customer goods data to add items to a container
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
                      {container.container_number} - {container.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setUploadStep("upload")} 
              disabled={!selectedContainerId}
              className="w-full"
            >
              Continue to Upload
            </Button>
          </div>
        )}

        {uploadStep === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Container: {containers?.find(c => c.id === selectedContainerId)?.container_number}</span>
            </div>

            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Click to upload CSV</p>
              <p className="text-sm text-muted-foreground mt-1">or drag and drop your file here</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
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
                <li><code className="bg-muted px-1 rounded">client_code</code> - Customer tracking code (e.g., AEF_JOHNDOE)</li>
                <li><code className="bg-muted px-1 rounded">client_name</code> - Customer's full name</li>
                <li><code className="bg-muted px-1 rounded">tracking_number</code> - Item tracking reference</li>
                <li><code className="bg-muted px-1 rounded">item_name</code> - Name of product</li>
                <li><code className="bg-muted px-1 rounded">length</code> - Package length (cm)</li>
                <li><code className="bg-muted px-1 rounded">width</code> - Package width (cm)</li>
                <li><code className="bg-muted px-1 rounded">height</code> - Package height (cm)</li>
                <li><code className="bg-muted px-1 rounded">total_cbm</code> - Total CBM (auto-calculated if dimensions provided)</li>
              </ul>
              <h4 className="font-medium mt-3 mb-2">Optional Columns:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">quantity</code> - Number of items (default: 1)</li>
                <li><code className="bg-muted px-1 rounded">carton_count</code> - Number of cartons</li>
                <li><code className="bg-muted px-1 rounded">notes</code> - Additional remarks</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                <strong>CBM Formula:</strong> Width × Length × Height ÷ 1,000,000
              </p>
            </div>

            <Button variant="outline" onClick={() => setUploadStep("select")}>
              Back to Container Selection
            </Button>
          </div>
        )}

        {uploadStep === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{parsedData.length} items found</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {parsedData.filter(p => p.isNew).length} New
                </Badge>
                <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                  {parsedData.filter(p => !p.isNew).length} Updates
                </Badge>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Client Code</th>
                    <th className="text-left p-2">Client Name</th>
                    <th className="text-left p-2">Tracking #</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Dimensions</th>
                    <th className="text-left p-2">CBM</th>
                    <th className="text-left p-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono text-xs">{item.user_code}</td>
                      <td className="p-2 text-xs truncate max-w-[100px]">{item.client_name || '-'}</td>
                      <td className="p-2 text-xs">{item.tracking_number}</td>
                      <td className="p-2 truncate max-w-[120px]">{item.item_name}</td>
                      <td className="p-2 text-xs">{item.length}×{item.width}×{item.height}</td>
                      <td className="p-2 font-medium">{item.total_cbm.toFixed(4)}</td>
                      <td className="p-2">
                        <Badge variant={item.isNew ? "default" : "secondary"} className="text-xs">
                          {item.isNew ? "New" : "Update"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={processUpload} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Process Upload"}
              </Button>
            </div>
          </div>
        )}

        {uploadStep === "complete" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Upload Complete!</h3>
            
            <div className="flex justify-center gap-4">
              {results.created > 0 && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{results.created}</div>
                  <div className="text-sm">Items Created</div>
                </div>
              )}
              {results.updated > 0 && (
                <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{results.updated}</div>
                  <div className="text-sm">Items Updated</div>
                </div>
              )}
              {results.errors > 0 && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{results.errors}</div>
                  <div className="text-sm">Errors</div>
                </div>
              )}
            </div>

            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}

        {isProcessing && uploadStep === "upload" && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
