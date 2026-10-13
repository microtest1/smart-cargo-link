import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatCbm, formatGhs, freightForCbm } from "@/lib/pricing";

/**
 * Customer-facing freight estimator. Uses the single official CBM rate
 * (base rate x conversion rate) from the central pricing configuration.
 */
export function CbmRateCalculator() {
  const { pricing } = useCbmPricing();
  const [cbmInput, setCbmInput] = useState("");
  const [dims, setDims] = useState({ length: "", width: "", height: "" });

  const dimCbm =
    (Number(dims.length) || 0) * (Number(dims.width) || 0) * (Number(dims.height) || 0) / 1_000_000;
  const cbm = Number(cbmInput) > 0 ? Number(cbmInput) : dimCbm;
  const freight = freightForCbm(cbm, pricing);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          CBM Freight Calculator
        </CardTitle>
        <CardDescription>
          Official sea freight rate: {pricing.baseRate} × {pricing.exchangeRate} ={" "}
          {formatGhs(pricing.effectiveRate, pricing.currency)} per CBM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cbm-direct">Enter your CBM</Label>
          <Input
            id="cbm-direct"
            type="number"
            min="0"
            step="0.000001"
            inputMode="decimal"
            placeholder="e.g. 0.562"
            value={cbmInput}
            onChange={(e) => setCbmInput(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Or measure your carton (cm)</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["length", "width", "height"] as const).map((key) => (
              <Input
                key={key}
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={key[0].toUpperCase() + key.slice(1)}
                value={dims[key]}
                onChange={(e) => setDims((d) => ({ ...d, [key]: e.target.value }))}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">CBM = L × W × H ÷ 1,000,000</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-semibold">{formatCbm(cbm)} CBM</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Freight rate</span>
            <span className="font-semibold">{pricing.baseRate}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Conversion rate</span>
            <span className="font-semibold">{pricing.exchangeRate}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Effective rate</span>
            <span className="font-semibold">
              {formatGhs(pricing.effectiveRate, pricing.currency)} / CBM
            </span>
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-medium">Estimated freight charge</span>
            <span className="text-lg font-bold text-primary">
              {formatGhs(freight, pricing.currency)}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Formula: CBM × {pricing.baseRate} × {pricing.exchangeRate}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
