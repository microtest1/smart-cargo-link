import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CourierEvent {
  context: string;
  context_original?: string;
  time: string;
  status: string;
}

export interface CourierTrackingResult {
  tracking_number: string;
  courier_code: string;
  courier_name: string;
  status: string;
  state_code: string;
  is_delivered: boolean;
  events: CourierEvent[];
  warehouse_detection: {
    detected: boolean;
    warehouse_name: string | null;
    warehouse_type: string | null;
    message: string | null;
  };
  query_time: string;
}

export function useCourierTracking() {
  const [result, setResult] = useState<CourierTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackCourier = async (trackingNumber: string, courierCode?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "kuaidi100-track",
        {
          body: {
            tracking_number: trackingNumber,
            courier_code: courierCode || undefined,
          },
        }
      );

      if (fnError) {
        setError("Failed to connect to tracking service. Please try again.");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setResult(data as CourierTrackingResult);
    } catch (err) {
      console.error("Courier tracking error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { result, isLoading, error, trackCourier, reset };
}
