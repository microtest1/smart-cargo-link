import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";

interface CompanyAdminRouteProps {
  children: ReactNode;
}

export function CompanyAdminRoute({ children }: CompanyAdminRouteProps) {
  const { session, isLoading } = useCompanyAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/company-login" replace />;
  }

  return <>{children}</>;
}
