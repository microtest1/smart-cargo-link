import { useState } from "react";
import { Search, Package, Truck, CheckCircle, MapPin, Calendar, Loader2, Box, DollarSign, Globe, Phone, Tag, Ship, Weight, ChevronDown, Warehouse, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { cn } from "@/lib/utils";
import { useShip24Tracking } from "@/hooks/useShip24Tracking";
import { CourierTrackingView } from "@/components/tracking/CourierTrackingView";
import { ChinaWarehouseInfo } from "@/components/warehouse/ChinaWarehouseInfo";
import { Seo } from "@/components/seo/Seo";

interface TrackingResult {
  id: string;
  tracking_number: string;
  product_name: string;
  product_details: string | null;
  quantity_received: number;
  status: string;
  fulfillment_date: string;
  cbm: number | null;
  cbm_cost: number | null;
  container_name: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  containers?: {
    container_number: string;
    status: string;
    estimated_arrival: string | null;
  } | null;
}

const statusStages = [
  { key: "received", label: "Received at China Warehouse", icon: Package },
  { key: "packed", label: "Packed in China Warehouse", icon: Box },
  { key: "left_china", label: "Left China", icon: Truck },
  { key: "in_transit", label: "In Transit to Ghana", icon: Truck },
  { key: "arrived", label: "Arrived at Tema Warehouse", icon: CheckCircle },
];

const statusColors: Record<string, string> = {
  received: "bg-yellow-500",
  packed: "bg-blue-500",
  left_china: "bg-purple-500",
  in_transit: "bg-cargo-blue",
  arrived: "bg-success",
  delivered: "bg-cargo-teal",
};

type SearchType = "aef" | "courier" | "shipping_mark" | "phone" | null;

interface CourierInfo {
  name: string;
  url: (trackingNumber: string) => string;
}

const COURIER_PREFIXES: Record<string, CourierInfo> = {
  SF: {
    name: "SF Express",
    url: (tn) => `https://www.sf-express.com/we/ow/chn/en/dynamic_function/waybill/#search/bill-number/${tn}`,
  },
  YT: {
    name: "YTO Express",
    url: (tn) => `https://www.yto.net.cn/en/queryLogistic.html?orderNo=${tn}`,
  },
  LP: {
    name: "Cainiao",
    url: (tn) => `https://global.cainiao.com/detail.htm?mailNoList=${tn}`,
  },
};

function detectCourier(trackingNumber: string): CourierInfo | null {
  const upper = trackingNumber.trim().toUpperCase();
  for (const [prefix, info] of Object.entries(COURIER_PREFIXES)) {
    if (upper.startsWith(prefix)) return info;
  }
  return null;
}

function getCourierTrackingUrl(trackingNumber: string): string {
  const courier = detectCourier(trackingNumber);
  if (courier) return courier.url(trackingNumber.trim());
  return `https://www.17track.net/en/track?nums=${encodeURIComponent(trackingNumber.trim())}`;
}

function getCourierLabel(trackingNumber: string): string {
  const courier = detectCourier(trackingNumber);
  return courier ? `Track on ${courier.name}` : "Track Courier";
}

function isAEFCode(code: string): boolean {
  return /^AEF_\d{5}$/.test(code);
}

function isShippingMark(code: string): boolean {
  return /^AEF_[A-Z]+$/i.test(code) && !/^AEF_\d{5}$/.test(code);
}

function isPhoneNumber(input: string): boolean {
  const cleaned = input.replace(/[\s\-\+\(\)]/g, "");
  return /^(0\d{9}|233\d{9}|\d{7,15})$/.test(cleaned);
}

function isCourierNumber(code: string): boolean {
  return !isAEFCode(code) && !isShippingMark(code) && !isPhoneNumber(code) && /^[A-Za-z0-9]{6,30}$/.test(code);
}

function detectSearchType(input: string): SearchType {
  const code = input.trim().toUpperCase();
  if (!code) return null;
  if (isAEFCode(code)) return "aef";
  if (isShippingMark(code)) return "shipping_mark";
  if (isPhoneNumber(input.trim())) return "phone";
  if (isCourierNumber(code)) return "courier";
  return null;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "233" + cleaned.substring(1);
  }
  return cleaned;
}

// Group results by container for display
function ContainerGroupedResults({ 
  results, trackingCode, getStatusIndex, formatStatus, getNextAction 
}: { 
  results: TrackingResult[]; 
  trackingCode: string;
  getStatusIndex: (s: string) => number;
  formatStatus: (s: string) => string;
  getNextAction: (s: string) => string;
}) {
  const [expandedContainers, setExpandedContainers] = useState<Record<string, boolean>>({});

  // Group by container
  const containerGroups = results.reduce<Record<string, { container: TrackingResult["containers"]; containerName: string; items: TrackingResult[] }>>((acc, result) => {
    const key = result.containers?.container_number || result.container_name || "unassigned";
    if (!acc[key]) {
      acc[key] = { container: result.containers, containerName: key, items: [] };
    }
    acc[key].items.push(result);
    return acc;
  }, {});

  const groups = Object.values(containerGroups);
  const hasMultipleItems = results.length > 1;
  const toggleContainer = (key: string) => {
    setExpandedContainers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // If only one result and no container, show simple view
  if (results.length === 1 && !results[0].containers) {
    const result = results[0];
    const currentStatusIndex = getStatusIndex(result.status);
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Shipment Status
        </h2>
        <SingleResultCard result={result} trackingCode={trackingCode} currentStatusIndex={currentStatusIndex} formatStatus={formatStatus} getNextAction={getNextAction} />
      </div>
    );
  }

  // Container-grouped view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Ship className="w-5 h-5 text-primary" />
          Amoliga Elite Logistics Status
        </h2>
        <span className="text-sm text-muted-foreground">
          {results.length} item{results.length !== 1 ? "s" : ""} in {groups.length} container{groups.length !== 1 ? "s" : ""}
        </span>
      </div>

      {groups.map((group) => {
        const isExpanded = expandedContainers[group.containerName] !== false; // default expanded
        const totalCBM = group.items.reduce((sum, r) => sum + (r.cbm || 0), 0);
        const containerStatus = group.container?.status || "loading";

        return (
          <Card key={group.containerName} className="overflow-hidden">
            {/* Container Header */}
            <button
              onClick={() => toggleContainer(group.containerName)}
              className="w-full text-left p-4 sm:p-5 focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Ship className="w-5 h-5 text-primary shrink-0" />
                    <h3 className="font-bold text-base sm:text-lg">
                      {group.containerName === "unassigned" ? "Pending Container Assignment" : group.containerName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> China → Ghana
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                    </Badge>
                    {totalCBM > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {totalCBM.toFixed(3)} CBM
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {group.container?.estimated_arrival && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ETA</p>
                      <p className="text-sm font-semibold text-primary">
                        {format(new Date(group.container.estimated_arrival), "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>
            </button>

            {/* Expanded items table */}
            {isExpanded && (
              <div className="border-t">
                <div className="p-4 sm:p-5">
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-sm min-w-[450px]">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Product</th>
                          <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Qty</th>
                          <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">CBM</th>
                          <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Status</th>
                          <th className="text-center py-2.5 px-3 font-medium text-muted-foreground text-xs w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2.5 px-3">
                              <p className="font-medium">{item.product_name}</p>
                              {item.product_details && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{item.product_details}</p>
                              )}
                              {item.customer_name && (
                                <p className="text-[11px] text-muted-foreground">{item.customer_name}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">{item.quantity_received}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-xs">{item.cbm?.toFixed(3) || "—"}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {formatStatus(item.status).split(" ").slice(0, 2).join(" ")}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <a
                                href={getCourierTrackingUrl(item.tracking_number)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={getCourierLabel(item.tracking_number)}
                              >
                                <Button variant="ghost" size="iconSm" className="h-7 w-7" title="Track Courier">
                                  <Globe className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial details are private — only the signed-in owner sees CBM and charges */}
                  {totalCBM > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                        <p className="text-sm font-semibold text-primary">Cargo volume and freight charges are private</p>
                        <p className="text-xs text-muted-foreground">Sign in to your AEF account to view your CBM and freight amount.</p>
                      </div>
                    </>
                  )}

                  {/* Next action */}
                  <div className="mt-4 pt-3 border-t flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Next:</span>
                    <span className="text-sm text-muted-foreground">{getNextAction(group.items[0]?.status || "received")}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Account prompt for unauthenticated users */}
      <Card className="p-5 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Track & Manage Your Shipments</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Create an account to get your unique AEF tracking code, select goods for delivery, and manage invoices.
            </p>
            <div className="flex gap-2">
              <Link to="/signup">
                <Button size="sm">Create Account</Button>
              </Link>
              <Link to="/login">
                <Button size="sm" variant="outline">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Simple single-result card (no container)
function SingleResultCard({ result, trackingCode, currentStatusIndex, formatStatus, getNextAction }: {
  result: TrackingResult;
  trackingCode: string;
  currentStatusIndex: number;
  formatStatus: (s: string) => string;
  getNextAction: (s: string) => string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            {result.customer_name && (
              <p className="text-sm font-medium text-muted-foreground mb-1">{result.customer_name}</p>
            )}
            <CardTitle className="flex items-center gap-2 text-lg mb-1">
              <Package className="w-5 h-5 text-primary" />
              {result.tracking_number || trackingCode.trim().toUpperCase()}
            </CardTitle>
            <CardDescription className="text-base">
              {result.product_name}
              {result.product_details && ` - ${result.product_details}`}
            </CardDescription>
          </div>
          <Badge className={cn("capitalize", statusColors[result.status] || "bg-muted")}>
            {formatStatus(result.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {result.customer_name && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Tag className="w-4 h-4" /><span>Customer</span>
              </div>
              <p className="font-semibold">{result.customer_name}</p>
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Box className="w-4 h-4" /><span>Quantity</span>
            </div>
            <p className="font-semibold">{result.quantity_received}</p>
          </div>
          {result.cbm && result.cbm > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4" /><span>CBM</span>
              </div>
              <p className="font-semibold">{result.cbm.toFixed(3)} m³</p>
            </div>
          )}
          {(result.containers?.container_number || result.container_name) && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Ship className="w-4 h-4" /><span>Container</span>
              </div>
              <p className="font-semibold font-mono text-xs">{result.containers?.container_number || result.container_name}</p>
            </div>
          )}
          {result.containers?.estimated_arrival && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" /><span>Est. Arrival</span>
              </div>
              <p className="font-semibold">{format(new Date(result.containers.estimated_arrival), "dd MMM yyyy")}</p>
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" /><span>Last Update</span>
            </div>
            <p className="font-semibold">{format(new Date(result.updated_at), "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Track Courier Button */}
        <a
          href={getCourierTrackingUrl(result.tracking_number)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="w-4 h-4" />
            {getCourierLabel(result.tracking_number)}
          </Button>
        </a>

        <div className="pt-4 border-t flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Next:</span>
          <span className="text-sm text-muted-foreground">{getNextAction(result.status)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicTracking() {
  const [trackingCode, setTrackingCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<SearchType>(null);

  const { result: courierResult, isLoading: courierLoading, isPolling: courierPolling, error: courierError, trackShipment: trackCourier, reset: resetCourier } = useShip24Tracking();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rawInput = trackingCode.trim();
    const code = rawInput.toUpperCase();
    if (!code) {
      setError("Please enter a tracking code, courier number, shipping mark, or phone number");
      return;
    }

    // Reset all states
    setError(null);
    setSearched(true);
    setResults([]);
    resetCourier();

    const detected = detectSearchType(rawInput);
    setSearchType(detected);

    if (detected === "aef" || detected === "shipping_mark") {
      // Search warehouse_submissions by customer_user_code (AEF code) or tracking_number (shipping mark)
      setIsLoading(true);
      try {
        let query = supabase
          .from("warehouse_submissions")
          .select(`
            id,
            tracking_number,
            product_name,
            product_details,
            quantity_received,
            status,
            fulfillment_date,
            cbm,
            cbm_cost,
            container_name,
            customer_name,
            created_at,
            updated_at,
            containers:container_id (
              container_number,
              status,
              estimated_arrival
            )
          `)
          .eq("visible_to_customer", true)
          .order("created_at", { ascending: false });

        if (detected === "aef") {
          query = query.eq("customer_user_code", code);
        } else {
          // Shipping mark: search by tracking_number which stores shipping marks
          query = query.eq("tracking_number", code);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          console.error("Query error:", queryError);
          setError("Tracking details are not yet available. Please check again later or contact support.");
          setResults([]);
        } else {
          setResults((data as TrackingResult[]) || []);
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("Tracking details are not yet available. Please check again later or contact support.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    } else if (detected === "phone") {
      // Search by phone number - find profiles with matching phone, then look up their submissions
      setIsLoading(true);
      try {
        const normalized = normalizePhone(rawInput);
        // Try multiple phone formats
        const phoneVariants = [normalized];
        if (normalized.startsWith("233")) {
          phoneVariants.push("0" + normalized.substring(3));
          phoneVariants.push("+233" + normalized.substring(3));
        }
        
        // Find profiles matching the phone
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("unique_code")
          .or(phoneVariants.map(p => `phone.eq.${p}`).join(","));

        if (profileError || !profiles || profiles.length === 0) {
          setError("No shipments found for this phone number. Please try your AEF tracking code instead.");
          setResults([]);
          setIsLoading(false);
          return;
        }

        const userCodes = profiles.map(p => p.unique_code).filter(Boolean);
        
        if (userCodes.length === 0) {
          setError("No shipments found for this phone number.");
          setResults([]);
          setIsLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("warehouse_submissions")
          .select(`
            id,
            tracking_number,
            product_name,
            product_details,
            quantity_received,
            status,
            fulfillment_date,
            cbm,
            cbm_cost,
            container_name,
            customer_name,
            created_at,
            updated_at,
            containers:container_id (
              container_number,
              status,
              estimated_arrival
            )
          `)
          .eq("visible_to_customer", true)
          .in("customer_user_code", userCodes)
          .order("created_at", { ascending: false });

        if (queryError) {
          setError("Tracking details are not yet available. Please check again later or contact support.");
          setResults([]);
        } else {
          setResults((data as TrackingResult[]) || []);
        }
      } catch (err) {
        console.error("Phone search error:", err);
        setError("An error occurred. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    } else if (detected === "courier") {
      // Courier tracking via Ship24
      await trackCourier(code);
    } else {
      setError("Please enter a valid AEF tracking code (e.g., AEF_00027), courier number, shipping mark (e.g., AEF_ADOMAKO), or phone number.");
    }
  };

  const getStatusIndex = (status: string) => {
    return statusStages.findIndex(s => s.key === status);
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      received: "Goods received at China warehouse",
      packed: "Packed at China warehouse",
      left_china: "Shipment in transit to Ghana",
      in_transit: "Shipment in transit to Ghana",
      arrived: "Goods arrived and ready for pickup or delivery",
      delivered: "Delivered",
    };
    return labels[status] || status;
  };

  const getNextAction = (status: string) => {
    const actions: Record<string, string> = {
      received: "Await packing and shipment",
      packed: "Await shipment departure from China",
      left_china: "Await arrival in Ghana",
      in_transit: "Await arrival in Ghana",
      arrived: "Arrange delivery or pickup from Tema warehouse",
      delivered: "Completed",
    };
    return actions[status] || "Check back later";
  };

  const isSearching = isLoading || courierLoading;
  const displayError = error || courierError;

  const [showWarehouseBanner, setShowWarehouseBanner] = useState(true);

  return (
    <>
      <Seo
        title="Track Your China to Ghana Shipment | Amoliga Elite Freight"
        description="Enter your tracking number to see the current stage of your China to Ghana shipment, from China warehouse receipt to arrival and pickup in Ghana."
        path="/track"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Warehouse Notice Banner */}
      {showWarehouseBanner && (
        <div className="bg-primary text-primary-foreground sticky top-0 z-[60]">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <button
              onClick={() => document.getElementById("warehouse-info-section")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 text-sm font-medium hover:underline flex-1 text-left"
            >
              <Package className="w-4 h-4 flex-shrink-0" />
              <span>📦 New Warehouse Address in China – Click to View</span>
            </button>
            <button onClick={() => setShowWarehouseBanner(false)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={amoligaLogo} alt="Amoliga" className="h-10 w-auto" />
            <span className="font-display font-bold text-xl hidden sm:block">Amoliga</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            Track Your Shipment
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Where is your cargo?
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your AEF tracking code, courier tracking number, shipping mark, or phone number to see your shipment status.
          </p>
        </div>

        {/* Tabs: Internal Search vs Live Tracking */}
        <Tabs defaultValue="search" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              AEF Tracking
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Live Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <Card className="mb-8 shadow-lg border-border/50">
              <CardContent className="pt-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter AEF Code, Courier Number, Shipping Mark, or Phone Number"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      className="pl-10 h-12 text-lg"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12 px-8" disabled={isSearching}>
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Track
                      </>
                    )}
                  </Button>
                </form>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    AEF_XXXXX
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Courier: YT/SF/JD
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Mark: AEF_ADOMAKO
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone: 0555111409
                  </span>
                </div>
                {displayError && (
                  <p className="text-destructive text-sm mt-3">{displayError}</p>
                )}
              </CardContent>
            </Card>

            {searched && (
              <div className="space-y-6">
                {searchType === "courier" && courierResult && (
                  <div className="space-y-6">
                    <CourierTrackingView data={courierResult} isPolling={courierPolling} />
                  </div>
                )}

                {(searchType === "aef" || searchType === "shipping_mark" || searchType === "phone") && (
                  <>
                    {results.length === 0 && !isLoading ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="font-semibold text-lg mb-2">Tracking number not found</h3>
                          <p className="text-muted-foreground mb-4">
                            Please contact Amoliga Elite support.
                          </p>
                          <a href="tel:+233307001743">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Phone className="w-4 h-4" />
                              Contact Support
                            </Button>
                          </a>
                        </CardContent>
                      </Card>
                    ) : (
                      <ContainerGroupedResults 
                        results={results} 
                        trackingCode={trackingCode} 
                        getStatusIndex={getStatusIndex}
                        formatStatus={formatStatus}
                        getNextAction={getNextAction}
                      />
                    )}
                  </>
                )}

                {searchType === "courier" && !courierResult && !courierLoading && !courierError && (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Truck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-semibold text-lg mb-2">No tracking data found</h3>
                      <p className="text-muted-foreground">
                        The courier tracking number may be invalid or not yet in the system.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {!searched && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="text-center p-6">
                    <Package className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h3 className="font-semibold mb-2">Received in China</h3>
                    <p className="text-sm text-muted-foreground">
                      Your goods arrive at our China warehouse and are logged into the system.
                    </p>
                  </Card>
                  <Card className="text-center p-6">
                    <Truck className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h3 className="font-semibold mb-2">Shipped to Ghana</h3>
                    <p className="text-sm text-muted-foreground">
                      Your cargo is packed and shipped via sea freight to Ghana.
                    </p>
                  </Card>
                  <Card className="text-center p-6">
                    <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h3 className="font-semibold mb-2">Arrive & Deliver</h3>
                    <p className="text-sm text-muted-foreground">
                      Collect from our Tema warehouse or get doorstep delivery.
                    </p>
                  </Card>
                </div>

                <div id="warehouse-info-section">
                  <div className="flex items-center gap-2 mb-4">
                    <Warehouse className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold text-xl">China Warehouse Address</h2>
                  </div>
                  <ChinaWarehouseInfo compact />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="live">
            <Card className="shadow-lg border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <iframe
                  src="https://amoligaelitegroupltd.ship24.com/?menuLess=true"
                  width="100%"
                  height="700"
                  style={{ border: "none", minHeight: "500px" }}
                  title="Ship24 Live Tracking"
                  allow="clipboard-write"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card/50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Amoliga Elite Freight & Logistics. All rights reserved.</p>
          <p className="mt-2">
            Need help? <a href="tel:+233307001743" className="text-primary hover:underline">Contact Support</a>
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}
