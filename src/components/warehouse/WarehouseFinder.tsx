import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  MapPin,
  MessageCircle,
  Package,
  Plane,
  RefreshCw,
  Ship,
  Tag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CUSTOMER_NAME_PLACEHOLDER,
  CUSTOMER_PHONE_PLACEHOLDER,
  GHANA_LOCATION_PLACEHOLDER,
  SHIPPING_MARK_PLACEHOLDER,
  WAREHOUSES,
  type WarehouseCategory,
  type WarehouseEntry,
} from "@/content/warehouses";

const WHATSAPP_URL =
  "https://wa.me/233208878817?text=Hello%20Amoliga%20Elite!%20Please%20help%20me%20choose%20the%20right%20China%20warehouse.";

const CATEGORY_ICON: Record<WarehouseCategory, React.ElementType> = {
  sea: Ship,
  vehicle: Truck,
  repacking: RefreshCw,
  air: Plane,
};

interface CustomerWarehouseDetails {
  shippingMark?: string;
  customerName?: string;
  customerPhone?: string;
  ghanaLocation?: string;
}

interface VehicleDetails {
  identifier: string;
  model: string;
  year: string;
}

function supplierCopyText(
  warehouse: WarehouseEntry,
  customer: CustomerWarehouseDetails,
  vehicle: VehicleDetails,
) {
  const lines = [
    warehouse.name.toUpperCase(),
    "",
    `China Warehouse Address:`,
    warehouse.address,
  ];

  if (warehouse.contactPerson) lines.push(`Contact Person: ${warehouse.contactPerson}`);
  if (warehouse.phone) lines.push(`Tel: ${warehouse.phone}`);

  lines.push(
    "",
    `Shipping Mark / AEF Code: ${customer.shippingMark || SHIPPING_MARK_PLACEHOLDER}`,
    `Name: ${customer.customerName || CUSTOMER_NAME_PLACEHOLDER}`,
    `Number: ${customer.customerPhone || CUSTOMER_PHONE_PLACEHOLDER}`,
    `GH / Location: ${customer.ghanaLocation || GHANA_LOCATION_PLACEHOLDER}`,
  );

  if (warehouse.category === "vehicle") {
    lines.push(
      `Chassis / VIN / Serial Number: ${vehicle.identifier}`,
      `Model: ${vehicle.model}`,
      `Year: ${vehicle.year}`,
    );
  }

  return lines.join("\n");
}

function WarehousePanel({
  warehouse,
  customer,
  signedIn,
}: {
  warehouse: WarehouseEntry;
  customer: CustomerWarehouseDetails;
  signedIn: boolean;
}) {
  const Icon = CATEGORY_ICON[warehouse.category];
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleDetails>({ identifier: "", model: "", year: "" });
  const isVehicle = warehouse.category === "vehicle";

  const copyDetails = async () => {
    if (isVehicle && (!vehicle.identifier.trim() || !vehicle.model.trim() || !vehicle.year.trim())) {
      toast({
        title: "Vehicle details required",
        description: "Enter the chassis/VIN/serial number, model and year before copying.",
        variant: "destructive",
      });
      return;
    }

    const text = supplierCopyText(warehouse, customer, vehicle);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const element = document.createElement("textarea");
      element.value = text;
      document.body.appendChild(element);
      element.select();
      document.execCommand("copy");
      document.body.removeChild(element);
    }
    setCopied(true);
    toast({ title: "Warehouse details copied successfully." });
    window.setTimeout(() => setCopied(false), 2000);
  };

  const displayFields = [
    ["Shipping Mark / AEF Code", customer.shippingMark || SHIPPING_MARK_PLACEHOLDER],
    ["Name", customer.customerName || CUSTOMER_NAME_PLACEHOLDER],
    ["Number", customer.customerPhone || CUSTOMER_PHONE_PLACEHOLDER],
    ["GH / Location", customer.ghanaLocation || GHANA_LOCATION_PLACEHOLDER],
  ];

  return (
    <TabsContent value={warehouse.id} className="mt-5">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-primary px-5 py-5 text-primary-foreground sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">{warehouse.typeLabel}</Badge>
              <h3 className="text-lg font-bold">{warehouse.name}</h3>
              <p className="mt-1 text-sm text-primary-foreground/75">{warehouse.bestFor}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Official China address</p>
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="select-all break-words text-base font-semibold leading-7">{warehouse.address}</p>
            </div>
            {(warehouse.contactPerson || warehouse.phone) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {warehouse.contactPerson ? `Contact: ${warehouse.contactPerson}` : ""}
                {warehouse.contactPerson && warehouse.phone ? " · " : ""}
                {warehouse.phone ? `Tel: ${warehouse.phone}` : ""}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {displayFields.map(([label, value]) => (
              <div key={label} className="rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 break-words font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {isVehicle && (
            <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm font-semibold">Vehicle identification details</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-identifier">Chassis / VIN / Serial Number</Label>
                  <Input id="vehicle-identifier" value={vehicle.identifier} onChange={(event) => setVehicle((current) => ({ ...current, identifier: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-model">Model</Label>
                  <Input id="vehicle-model" value={vehicle.model} onChange={(event) => setVehicle((current) => ({ ...current, model: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-year">Year</Label>
                  <Input id="vehicle-year" type="number" min="1886" max="2200" value={vehicle.year} onChange={(event) => setVehicle((current) => ({ ...current, year: event.target.value }))} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Always provide your AEF Code / Shipping Mark to your supplier.</p>
              <p className="text-muted-foreground">It must be clearly written on every package so your goods can be matched to your account without delays.</p>
              {isVehicle && <p className="text-muted-foreground">Also provide the chassis/VIN/serial number, model and year for every vehicle.</p>}
            </div>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={copyDetails}>
            {copied ? <Check className="h-5 w-5" /> : <ClipboardCopy className="h-5 w-5" />}
            {copied ? "WAREHOUSE DETAILS COPIED" : "COPY WAREHOUSE DETAILS"}
          </Button>

          {!signedIn && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="accent" className="h-auto min-h-10 whitespace-normal py-2 text-center text-xs leading-4">
                <Link to="/signup"><Tag className="mr-2 h-4 w-4 shrink-0" />Create an Account to Get Your AEF Code / Shipping Mark</Link>
              </Button>
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal py-2 text-center text-xs leading-4">
                <Link to="/login">Sign In to View Your Shipping Mark</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}

export function WarehouseFinder({
  shippingMark,
  customerName,
  customerPhone,
  ghanaLocation,
  signedIn = false,
}: CustomerWarehouseDetails & { compact?: boolean; signedIn?: boolean }) {
  const customer = useMemo(
    () => ({ shippingMark, customerName, customerPhone, ghanaLocation }),
    [shippingMark, customerName, customerPhone, ghanaLocation],
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sea">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
          {WAREHOUSES.map((warehouse) => {
            const Icon = CATEGORY_ICON[warehouse.category];
            return (
              <TabsTrigger key={warehouse.id} value={warehouse.id} className="min-h-12 gap-2 whitespace-normal px-2 text-center">
                <Icon className="h-4 w-4 shrink-0" />
                {warehouse.typeLabel}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {WAREHOUSES.map((warehouse) => (
          <WarehousePanel key={warehouse.id} warehouse={warehouse} customer={customer} signedIn={signedIn} />
        ))}
      </Tabs>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Send the copied details to your supplier before they dispatch your goods.</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(WHATSAPP_URL, "_blank")}>
          <MessageCircle className="h-4 w-4" />
          Need help choosing?
        </Button>
      </div>
    </div>
  );
}