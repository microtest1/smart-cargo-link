import { Bell, Menu, Search, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { useNotifications } from "@/hooks/useNotifications";

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
}

export function AppHeader({ title = "Amoliga Elite", showSearch = false, onMenuClick }: AppHeaderProps) {
  const { unreadCount } = useNotifications();
  const hasNotifications = unreadCount > 0;

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="iconSm" onClick={onMenuClick}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Link to="/dashboard" className="flex items-center gap-2">
            <img 
              src={amoligaLogo} 
              alt="Amoliga Elite" 
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Link to="/support">
            <Button variant="ghost" size="iconSm">
              <Headphones className="w-5 h-5" />
            </Button>
          </Link>
          {showSearch && (
            <Link to="/shipments">
              <Button variant="ghost" size="iconSm">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
          )}
          <Link to="/notifications">
            <Button variant="ghost" size="iconSm" className="relative">
              <Bell className="w-5 h-5" />
              {hasNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
