import { MapPin, Phone, Mail, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompanyCardProps {
  name: string;
  logo?: string;
  manager: string;
  phone: string;
  phone2?: string;
  email: string;
  whatsapp?: string;
  chinaAddress: string;
  ghanaAddress: string;
  services?: string;
  onClick?: () => void;
}

export function CompanyCard({
  name,
  logo,
  manager,
  phone,
  phone2,
  email,
  whatsapp,
  chinaAddress,
  ghanaAddress,
  services,
  onClick,
}: CompanyCardProps) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (whatsapp) {
      window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border border-border/50"
    >
      {/* Header */}
      <div className="gradient-hero p-4 flex items-center gap-4">
        {logo ? (
          <img src={logo} alt={name} className="w-14 h-14 rounded-xl bg-white object-contain p-1" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">
              {name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg text-primary-foreground truncate">
            {name}
          </h3>
          <p className="text-primary-foreground/70 text-sm">Manager: {manager}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary-foreground/50" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {services && (
          <p className="text-sm text-muted-foreground">{services}</p>
        )}

        {/* Contact Info */}
        <div className="space-y-2 p-3 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{phone}</span>
          </div>
          {phone2 && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{phone2}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{email}</span>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cargo-orange/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-cargo-orange" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">China Warehouse</p>
              <p className="text-sm">{chinaAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cargo-teal/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-cargo-teal" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ghana Warehouse</p>
              <p className="text-sm">{ghanaAddress}</p>
            </div>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCall}
          >
            <Phone className="w-4 h-4 mr-1" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleEmail}
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          {whatsapp && (
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
