import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Ship24Event {
  context: string;
  location: string;
  time: string;
  status: string;
}

export interface Ship24TrackingResult {
  tracking_number: string;
  courier_code: string;
  courier_name: string;
  status: string;
  is_delivered: boolean;
  current_location: string;
  destination: string;
  events: Ship24Event[];
  warehouse_detection: {
    detected: boolean;
    warehouse_name: string | null;
    warehouse_type: string | null;
    message: string | null;
  };
  guangzhou_proximity?: {
    detected: boolean;
    arrival_time: string | null;
  };
  warehouse_confirmation?: boolean;
  warehouse_confirmed_at?: string | null;
  query_time: string;
  message?: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds
const MAX_POLLS = 10; // stop after 5 minutes

export function useShip24Tracking() {
  const [result, setResult] = useState<Ship24TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
    pollCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const fetchTracking = useCallback(async (trackingNumber: string): Promise<Ship24TrackingResult | null> => {
    const { data, error: fnError } = await supabase.functions.invoke("ship24-track", {
      body: { tracking_number: trackingNumber },
    });
    if (fnError || data?.error) return null;
    return data as Ship24TrackingResult;
  }, []);

  const needsPolling = (data: Ship24TrackingResult) =>
    (!data.courier_code && data.courier_name === "Detecting...") || data.status === "Registered";

  const trackShipment = async (trackingNumber: string) => {
    stopPolling();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ship24-track", {
        body: { tracking_number: trackingNumber },
      });

      if (fnError) {
        setError("Failed to connect to tracking service. Please try again.");
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }

      const trackingResult = data as Ship24TrackingResult;
      setResult(trackingResult);

      // Start polling if courier is still detecting
      if (needsPolling(trackingResult)) {
        setIsPolling(true);
        pollCountRef.current = 0;
        pollRef.current = setInterval(async () => {
          pollCountRef.current++;
          if (pollCountRef.current >= MAX_POLLS) {
            stopPolling();
            return;
          }
          const updated = await fetchTracking(trackingNumber);
          if (updated) {
            setResult(updated);
            if (!needsPolling(updated)) stopPolling();
          }
        }, POLL_INTERVAL);
      }
    } catch (err) {
      console.error("Ship24 tracking error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    stopPolling();
    setResult(null);
    setError(null);
  };

  return { result, isLoading, isPolling, error, trackShipment, reset };
}
