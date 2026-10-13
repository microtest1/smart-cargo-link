import { ArrowLeftRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const WHATSAPP_URL = "https://wa.link/uo00f7";

interface BuyYuanButtonProps {
  className?: string;
  compact?: boolean;
}

export function BuyYuanButton({ className, compact = false }: BuyYuanButtonProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/20 dark:border-amber-800/40",
        compact && "p-3",
        className
      )}
    >
      {/* New Service Badge */}
      <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
        <Sparkles className="h-2.5 w-2.5" />
        New
      </span>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-inner">
          <ArrowLeftRight className="h-6 w-6 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-display text-sm font-bold text-amber-900 dark:text-amber-100">
            Buy Chinese Yuan
          </h3>
          {!compact && (
            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/70">
              Secure Yuan purchase for payments to Chinese suppliers
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
