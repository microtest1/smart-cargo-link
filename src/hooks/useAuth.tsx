import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  unique_code: string | null;
}

interface UserRole {
  role: "customer" | "manager" | "admin" | "staff";
  company_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Marks that the current browser session performed an explicit sign-in.
// Cleared automatically when the browser/tab is closed.
const FRESH_AUTH_KEY = "aef_fresh_auth";
const FRESH_OAUTH_PENDING_KEY = "aef_fresh_oauth_pending";
const FRESH_OAUTH_WINDOW_MS = 5 * 60 * 1000;

// OAuth leaves the page before a user id is available. This short-lived marker
// is exchanged for a user-specific fresh-session marker after the callback.
export const markFreshAuth = () => {
  sessionStorage.removeItem(FRESH_AUTH_KEY);
  sessionStorage.setItem(FRESH_OAUTH_PENDING_KEY, Date.now().toString());
};

const completeFreshAuth = (userId: string) => {
  sessionStorage.setItem(FRESH_AUTH_KEY, userId);
  sessionStorage.removeItem(FRESH_OAUTH_PENDING_KEY);
};

const hasValidOAuthAttempt = () => {
  const startedAt = Number(sessionStorage.getItem(FRESH_OAUTH_PENDING_KEY));
  return Number.isFinite(startedAt) && Date.now() - startedAt <= FRESH_OAUTH_WINDOW_MS;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", userId);

    const fetchedRoles = (rolesData as UserRole[]) ?? [];

    // Admin/manager/staff sessions are not allowed to survive a browser restart:
    // they must sign in fresh. FRESH_AUTH_KEY lives in sessionStorage, which is
    // cleared when the browser/tab is closed.
    const isPrivileged = fetchedRoles.some((r) =>
      r.role === "admin" || r.role === "manager" || r.role === "staff"
    );
    if (isPrivileged && sessionStorage.getItem(FRESH_AUTH_KEY) !== userId) {
      await supabase.auth.signOut();
      setProfile(null);
      setRoles([]);
      setRolesLoaded(true);
      return;
    }

    setRoles(fetchedRoles);
    setRolesLoaded(true);
  };


  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let loadedUserId: string | null = null;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user && hasValidOAuthAttempt()) {
          completeFreshAuth(session.user.id);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Token refreshes keep the same user: don't re-fetch or flip loading,
          // otherwise route guards flicker and can bounce admins mid-session.
          if (loadedUserId !== session.user.id) {
            loadedUserId = session.user.id;
            setRolesLoaded(false);
            const userId = session.user.id;
            setTimeout(() => fetchProfile(userId), 0);
          }
        } else {
          loadedUserId = null;
          setProfile(null);
          setRoles([]);
          setRolesLoaded(true);
        }

        setIsLoading(false);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (loadedUserId !== session.user.id) {
          loadedUserId = session.user.id;
          fetchProfile(session.user.id);
        }
      } else {
        setRolesLoaded(true);
      }
      setIsLoading(false);
    });


    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    sessionStorage.removeItem(FRESH_AUTH_KEY);
    sessionStorage.removeItem(FRESH_OAUTH_PENDING_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      completeFreshAuth(data.user.id);
    }
    return { error };
  };

  const signOut = async () => {
    sessionStorage.removeItem(FRESH_AUTH_KEY);
    sessionStorage.removeItem(FRESH_OAUTH_PENDING_KEY);
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const isAdmin = roles.some((r) => r.role === "admin");
  const isStaff = roles.some((r) => r.role === "staff");
  const isManager = roles.some((r) => r.role === "manager") || isAdmin || isStaff;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading: isLoading || (!!user && !rolesLoaded),
        isAdmin,
        isManager,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
