import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { PackageCheck } from "lucide-react";

/**
 * Shows the customer the "goods received at China warehouse" notices that
 * an admin sent to their phone number before/around signup.
 */
export function NewClientWarehouseAlert() {
  const { user } = useAuth();

  const { data: records } = useQuery({
    queryKey: ["my-new-client-sms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_client_sms")
        .select("id, product_description, tracking_number, cbm, weight_kg, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  if (!records?.length) return null;

  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PackageCheck className="w-5 h-5 text-success" />
        <h3 className="font-display font-semibold">Goods Received in China Warehouse</h3>
      </div>
      <div className="space-y-2">
        {records.map((r) => (
          <div
            key={r.id}
            className="rounded-xl bg-card border border-border/50 p-3 flex flex-wrap items-center gap-2 justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {r.product_description || "Your goods"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {r.tracking_number || "No tracking number"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.cbm != null && <Badge variant="secondary">{r.cbm} CBM</Badge>}
              {r.weight_kg != null && <Badge variant="secondary">{r.weight_kg} kg</Badge>}
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        You will get an update as soon as your goods are uploaded into a container. No internet?
        Dial <span className="font-mono font-medium">*713*12345#</span> to track your shipment,
        check your invoice balance and pay by mobile money.
      </p>

    </div>
  );
}
