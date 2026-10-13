import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Eye,
  Receipt,
  FileCheck,
  Truck,
  Calendar,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  type: "invoice" | "receipt" | "waybill" | "customs";
  date: Date;
  size: string;
  status: "available" | "pending";
  shipmentId?: string;
}

const documentIcons = {
  invoice: Receipt,
  receipt: FileCheck,
  waybill: Truck,
  customs: FileText,
};

const mockDocuments: Document[] = [
  { id: "1", name: "Invoice #INV-2025-001", type: "invoice", date: new Date(2025, 0, 10), size: "245 KB", status: "available", shipmentId: "SH001" },
  { id: "2", name: "Payment Receipt #RCP-001", type: "receipt", date: new Date(2025, 0, 10), size: "128 KB", status: "available" },
  { id: "3", name: "Waybill #WB-2025-001", type: "waybill", date: new Date(2025, 0, 8), size: "312 KB", status: "available", shipmentId: "SH001" },
  { id: "4", name: "Customs Declaration", type: "customs", date: new Date(2025, 0, 5), size: "456 KB", status: "pending", shipmentId: "SH002" },
  { id: "5", name: "Invoice #INV-2025-002", type: "invoice", date: new Date(2025, 0, 3), size: "198 KB", status: "available", shipmentId: "SH002" },
];

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || doc.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleDownload = (doc: Document) => {
    // Simulate download
    const link = document.createElement("a");
    link.href = "#";
    link.download = doc.name;
    link.click();
  };

  const handleView = (doc: Document) => {
    // Would open document viewer
    console.log("View document:", doc.id);
  };

  return (
    <AppLayout title="Documents">
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Documents</h1>
          <p className="text-muted-foreground text-sm">View and download your documents</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="invoice" className="text-xs">Invoices</TabsTrigger>
            <TabsTrigger value="receipt" className="text-xs">Receipts</TabsTrigger>
            <TabsTrigger value="waybill" className="text-xs">Waybills</TabsTrigger>
            <TabsTrigger value="customs" className="text-xs">Customs</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const Icon = documentIcons[doc.type];
                return (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          doc.type === "invoice" && "bg-blue-500/10 text-blue-500",
                          doc.type === "receipt" && "bg-green-500/10 text-green-500",
                          doc.type === "waybill" && "bg-orange-500/10 text-orange-500",
                          doc.type === "customs" && "bg-purple-500/10 text-purple-500",
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{doc.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(doc.date, "MMM d, yyyy")}</span>
                            <span>·</span>
                            <span>{doc.size}</span>
                          </div>
                          {doc.shipmentId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Shipment: {doc.shipmentId}
                            </p>
                          )}
                          {doc.status === "pending" && (
                            <span className="inline-block text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full mt-2">
                              Processing
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(doc)}
                            disabled={doc.status === "pending"}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            disabled={doc.status === "pending"}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No documents found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Your documents will appear here"}
            </p>
          </div>
        )}

        {/* Document Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{mockDocuments.length}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {mockDocuments.filter(d => d.status === "available").length}
              </p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
