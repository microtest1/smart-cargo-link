import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedContainer {
  container_number: string;
  status?: string;
  departure_date?: string;
  estimated_arrival?: string;
  capacity?: number;
  current_load?: number;
  notes?: string;
  isNew?: boolean;
  error?: string;
}

interface ContainerCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContainerCSVUpload({ open, onOpenChange }: ContainerCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedContainer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifyCustomers, setNotifyCustomers] = useState(true);
  const [uploadStep, setUploadStep] = useState<"upload" | "preview" | "complete">("upload");
  const [results, setResults] = useState<{ created: number; updated: number; errors: number }>({ created: 0, updated: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseCSV = (text: string): ParsedContainer[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const data: ParsedContainer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        if (header === 'container_number' || header === 'container number' || header === 'container') {
          row.container_number = value;
        } else if (header === 'status') {
          row.status = value.toLowerCase().replace(' ', '_');
        } else if (header === 'departure_date' || header === 'departure date' || header === 'departure') {
          row.departure_date = value;
        } else if (header === 'estimated_arrival' || header === 'estimated arrival' || header === 'eta' || header === 'arrival') {
          row.estimated_arrival = value;
        } else if (header === 'capacity') {
          row.capacity = parseInt(value) || undefined;
        } else if (header === 'current_load' || header === 'current load' || header === 'load') {
          row.current_load = parseInt(value) || undefined;
        } else if (header === 'notes') {
          row.notes = value;
        }
      });

      if (row.container_number) {
        data.push(row);
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
          description: "The CSV file appears to be empty or improperly formatted",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Check which containers already exist
      const containerNumbers = parsed.map(p => p.container_number);
      const { data: existing } = await supabase
        .from("containers")
        .select("container_number")
        .in("container_number", containerNumbers);

      const existingSet = new Set(existing?.map(e => e.container_number) || []);
      
      const validated = parsed.map(p => ({
        ...p,
        isNew: !existingSet.has(p.container_number),
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
    setIsProcessing(true);
    let created = 0;
    let updated = 0;
    let errors = 0;

    const updates: ParsedContainer[] = [];

    for (const item of parsedData) {
      try {
        const containerData: any = {
          container_number: item.container_number,
        };

        if (item.status) containerData.status = item.status;
        if (item.departure_date) containerData.departure_date = item.departure_date;
        if (item.estimated_arrival) containerData.estimated_arrival = item.estimated_arrival;
        if (item.capacity !== undefined) containerData.capacity = item.capacity;
        if (item.current_load !== undefined) containerData.current_load = item.current_load;
        if (item.notes) containerData.notes = item.notes;

        if (item.isNew) {
          const { error } = await supabase
            .from("containers")
            .insert([containerData]);
          
          if (error) throw error;
          created++;
        } else {
          const { error } = await supabase
            .from("containers")
            .update(containerData)
            .eq("container_number", item.container_number);
          
          if (error) throw error;
          updated++;
          updates.push(item);
        }
      } catch (error) {
        console.error(`Error processing ${item.container_number}:`, error);
        errors++;
      }
    }

    // Send notifications for updated containers
    if (notifyCustomers && updates.length > 0) {
      try {
        await supabase.functions.invoke("notify-container-update", {
          body: {
            updates: updates.map(u => ({
              container_number: u.container_number,
              status: u.status,
              departure_date: u.departure_date,
              estimated_arrival: u.estimated_arrival,
              notes: u.notes,
            })),
            notify_customers: true,
          },
        });
      } catch (error) {
        console.error("Failed to send notifications:", error);
      }
    }

    setResults({ created, updated, errors });
    setUploadStep("complete");
    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["containers"] });
  };

  const downloadTemplate = () => {
    const template = `container_number,status,departure_date,estimated_arrival,capacity,current_load,notes
CONT-2024-001,loading,2024-02-01,2024-02-15,100,25,Sample container
CONT-2024-002,in_transit,2024-01-20,2024-02-10,150,75,Another container`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'container_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setUploadStep("upload");
    setResults({ created: 0, updated: 0, errors: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Upload Containers
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to create or update multiple containers at once
          </DialogDescription>
        </DialogHeader>

        {uploadStep === "upload" && (
          <div className="space-y-4">
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
              <h4 className="font-medium mb-2">Expected Columns:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">container_number</code> - Required, unique identifier</li>
                <li><code className="bg-muted px-1 rounded">status</code> - loading, in_transit, arrived, delivered</li>
                <li><code className="bg-muted px-1 rounded">departure_date</code> - Format: YYYY-MM-DD</li>
                <li><code className="bg-muted px-1 rounded">estimated_arrival</code> - Format: YYYY-MM-DD</li>
                <li><code className="bg-muted px-1 rounded">capacity</code> - Number</li>
                <li><code className="bg-muted px-1 rounded">current_load</code> - Number</li>
                <li><code className="bg-muted px-1 rounded">notes</code> - Optional text</li>
              </ul>
            </div>
          </div>
        )}

        {uploadStep === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{parsedData.length} containers found</p>
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

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Container</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">ETA</th>
                    <th className="text-left p-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{item.container_number}</td>
                      <td className="p-2">{item.status || '-'}</td>
                      <td className="p-2">{item.estimated_arrival || '-'}</td>
                      <td className="p-2">
                        <Badge variant={item.isNew ? "default" : "secondary"}>
                          {item.isNew ? "New" : "Update"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="notify" 
                checked={notifyCustomers}
                onCheckedChange={(checked) => setNotifyCustomers(checked as boolean)}
              />
              <Label htmlFor="notify" className="text-sm">
                Send email notifications to customers with shipments in updated containers
              </Label>
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
                  <div className="text-sm">Created</div>
                </div>
              )}
              {results.updated > 0 && (
                <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{results.updated}</div>
                  <div className="text-sm">Updated</div>
                </div>
              )}
              {results.errors > 0 && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{results.errors}</div>
                  <div className="text-sm">Errors</div>
                </div>
              )}
            </div>

            {notifyCustomers && results.updated > 0 && (
              <p className="text-sm text-muted-foreground">
                Email notifications have been sent to affected customers
              </p>
            )}

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
