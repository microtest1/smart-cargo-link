import { useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCompanyAuth } from "./useCompanyAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Custom hook that returns a Supabase client configured with the company admin token.
 * This allows RLS policies to identify company admin requests.
 */
export function useCompanySupabase() {
  const { session } = useCompanyAuth();

  const companySupabase = useMemo(() => {
    if (!session?.token) {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          "x-company-token": session.token,
        },
      },
    });
  }, [session?.token]);

  return companySupabase;
}
