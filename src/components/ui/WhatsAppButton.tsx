import * as React from "react";
import { useState } from "react";
import { X, Phone, Headphones, Package, Landmark, Truck, Monitor, Warehouse, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958C9.792 30.988 12.79 32 16.004 32 24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.316 22.594c-.39 1.1-1.932 2.014-3.168 2.28-.846.18-1.95.324-5.67-1.218-4.762-1.974-7.828-6.812-8.064-7.128-.228-.316-1.912-2.546-1.912-4.858 0-2.312 1.21-3.45 1.64-3.92.39-.428.914-.614 1.356-.614.166 0 .316.008.45.016.43.018.646.044.93.72.354.846 1.218 2.966 1.324 3.182.108.216.216.502.072.788-.136.294-.256.426-.472.68-.216.254-.422.448-.638.722-.198.238-.422.492-.174.922.248.422 1.104 1.822 2.372 2.952 1.632 1.456 2.962 1.926 3.442 2.126.358.15.786.114 1.044-.158.328-.344.732-.914 1.144-1.476.294-.402.664-.454 1.058-.304.4.142 2.524 1.19 2.956 1.406.432.218.718.324.824.506.104.182.104 1.056-.286 2.156z"/>
    </svg>
  );
}

const contacts = [
  { icon: Package, label: "China Warehouse", phone: "", display: "" },
  { icon: Landmark, label: "Billing & Payments", phone: "0307001743", display: "030 700 1743" },
  { icon: Headphones, label: "Customer Service", phone: "0208878817", display: "020 887 8817" },
  { icon: Truck, label: "Delivery Support", phone: "0555709463", display: "055 570 9463" },
  { icon: Monitor, label: "ICT & Tracking", phone: "0307001745", display: "030 700 1745" },
  { icon: Warehouse, label: "Southern Zone", phone: "0307001746", display: "030 700 1746" },
  { icon: Warehouse, label: "Northern Zone", phone: "0307001744", display: "030 700 1744" },
];

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppButton({
  phoneNumber = "233208878817",
  message = "Hello Amoliga Elite! I need help with my shipment."
}: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Support Panel */}
      <div className={cn(
        "fixed right-4 z-[70] w-72 rounded-2xl bg-card border border-border shadow-2xl transition-all duration-300 origin-bottom-right",
        isOpen
          ? "bottom-24 md:bottom-24 scale-100 opacity-100 pointer-events-auto"
          : "bottom-20 md:bottom-20 scale-75 opacity-0 pointer-events-none"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-sm">Amoliga Support</h3>
            <p className="text-[10px] text-muted-foreground">Contact the right department</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Quick Link */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">WhatsApp Chat</p>
            <p className="text-[10px] text-muted-foreground">Quick message support</p>
          </div>
        </a>

        {/* Contact List */}
        <div className="max-h-64 overflow-y-auto">
          {contacts.filter((c) => c.phone).map((c) => (
            <a
              key={c.phone}
              href={`tel:${c.phone}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{c.label}</p>
                <p className="text-[10px] text-muted-foreground">{c.display}</p>
              </div>
              <Phone className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 md:bottom-6 bg-primary text-primary-foreground",
          isOpen && "rotate-90"
        )}
        aria-label="Customer Support"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
      </button>
    </>
  );
}
