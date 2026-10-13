import { AppLayout } from "@/components/layout/AppLayout";
import { Seo } from "@/components/seo/Seo";
import { CbmRateCalculator } from "@/components/cargo/CbmRateCalculator";

export default function CbmCalculator() {
  return (
    <AppLayout>
      <Seo
        title="CBM Freight Calculator | Amoliga Elite Freight"
        description="Estimate your China to Ghana sea freight charge instantly using the official CBM rate."
        path="/cbm-calculator"
        noindex
      />
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">CBM Freight Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Enter your cargo volume to see the estimated sea freight charge.
          </p>
        </div>
        <CbmRateCalculator />
      </div>
    </AppLayout>
  );
}
