import { Copy, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserCodeCardProps {
  code: string;
  name: string;
}

export function UserCodeCard({ code, name }: UserCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="gradient-hero rounded-2xl p-5 text-primary-foreground relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <p className="text-primary-foreground/70 text-sm mb-1">Welcome back,</p>
        <h2 className="font-display font-bold text-xl mb-4">{name}</h2>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-primary-foreground/70 text-xs mb-2">Your Unique Tracking Code</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-2xl tracking-wider">{code}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="text-primary-foreground hover:bg-white/20"
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        
        <p className="text-primary-foreground/60 text-xs mt-3 text-center">
          Use this code for all your shipments & warehouse labels
        </p>
      </div>
    </div>
  );
}
