import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
  showHeader?: boolean;
  showSearch?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  showNav = true, 
  showHeader = true,
  showSearch = false 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <AppHeader title={title} showSearch={showSearch} />}
      <main className={showNav ? "pb-24" : ""}>{children}</main>
      {showNav && <MobileNav />}
    </div>
  );
}
