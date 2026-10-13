import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanySession {
  adminId: string;
  companyId: string;
  companyName: string;
  token: string;
}

interface CompanyAuthContextType {
  session: CompanySession | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | undefined>(undefined);

const SESSION_KEY = "company_admin_session";
const ACTIVITY_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CompanySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from sessionStorage on mount (more secure than localStorage)
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as CompanySession;
        // Never expose privileged routes until the stored token is verified.
        verifySession(parsed.token)
          .then((valid) => {
            if (valid) setSession(parsed);
          })
          .finally(() => setIsLoading(false));
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    // Also clean up any old localStorage entries from previous implementation
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // Set up activity tracker to keep session alive
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      refreshSession();
    }, ACTIVITY_INTERVAL);

    return () => clearInterval(interval);
  }, [session]);

  const verifySession = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("verify_company_session" as any, {
        p_token: token,
      });

      if (error || !data || !(data as any)[0]?.valid) {
        setSession(null);
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }

      return true;
    } catch {
      setSession(null);
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    if (!session?.token) return false;
    return verifySession(session.token);
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("verify_company_admin_login" as any, {
        p_username: username.trim(),
        p_password: password,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("Company admin login RPC error:", error);
        return { success: false, error: error.message || "Login failed. Please try again." };
      }

      const result = (data as any)?.[0];
      
      if (!result?.success) {
        return { success: false, error: result?.error_message || "Invalid credentials" };
      }

      const newSession: CompanySession = {
        adminId: result.admin_id,
        companyId: result.company_id,
        companyName: result.company_name,
        token: result.session_token,
      };

      setSession(newSession);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed" };
    }
  };

  const logout = async () => {
    if (session?.token) {
      try {
        await supabase.rpc("logout_company_admin" as any, { p_token: session.token });
      } catch {
        // Ignore errors on logout
      }
    }
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <CompanyAuthContext.Provider value={{ session, isLoading, login, logout, refreshSession }}>
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const context = useContext(CompanyAuthContext);
  if (context === undefined) {
    throw new Error("useCompanyAuth must be used within a CompanyAuthProvider");
  }
  return context;
}
