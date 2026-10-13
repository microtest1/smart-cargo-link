import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeftRight, MessageCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const WHATSAPP_URL = "https://wa.link/uo00f7";

const steps = [
  {
    number: 1,
    title: "Request Exchange Rate",
    description: "Contact Amoliga Elite to request the current Yuan exchange rate.",
  },
  {
    number: 2,
    title: "Provide Details",
    description: "Provide the amount of Yuan you want to purchase and the supplier details.",
  },
  {
    number: 3,
    title: "Confirm Payment Amount",
    description: "Confirm the Ghana Cedis payment amount based on the exchange rate provided.",
  },
  {
    number: 4,
    title: "Make Payment",
    description: "Make payment and submit proof of payment.",
  },
  {
    number: 5,
    title: "Yuan Delivered",
    description: "Your Yuan will be sent to the supplier in China after confirmation.",
  },
];

export default function BuyYuan() {
  const navigate = useNavigate();

  return (
    <AppLayout title="">
      <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-background to-background dark:from-amber-950/20">
        {/* Header */}
        <div className="px-4 pt-4 pb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
              <ArrowLeftRight className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Buy Chinese Yuan</h1>
              <p className="text-sm text-muted-foreground">with Amoliga Elite</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Amoliga Elite provides secure Yuan purchasing services for customers
            who want to pay Chinese suppliers or complete business transactions
            in China. Follow the steps below to request Yuan.
          </p>
        </div>

        {/* Steps */}
        <div className="px-4 pb-6">
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative flex gap-4"
              >
                {/* Timeline connector */}
                {i < steps.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-[calc(100%+0.5rem)] bg-amber-200 dark:bg-amber-800/40" />
                )}

                {/* Step number */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-bold text-sm shadow-md z-10">
                  {step.number}
                </div>

                {/* Step content */}
                <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-6">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              className="w-full h-14 rounded-xl text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg gap-2"
              size="lg"
            >
              <MessageCircle className="w-5 h-5" />
              Request Yuan Now
            </Button>
          </a>
        </div>

        {/* Trust message */}
        <div className="px-4 pb-8">
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All Yuan transactions are handled securely through Amoliga Elite
              Freight &amp; Logistics.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
