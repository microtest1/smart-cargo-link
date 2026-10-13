import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface AlertResult {
  name: string;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WarehouseAlert {
  id: string;
  tracking_number: string;
  courier_name: string | null;
  shipment_location: string | null;
  alert_type: string;
  sms_status: string;
  sms_results: AlertResult[];
  created_at: string;
}

export default function AdminWarehouseAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["warehouse-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown) as WarehouseAlert[];
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-500/20 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case "partial":
        return <Badge className="bg-amber-500/20 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-700"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <AdminLayout title="Warehouse Alerts">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Shipment Alert Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : !alerts?.length ? (
              <p className="text-center text-muted-foreground py-8">No warehouse alerts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking Code</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Alert Time</TableHead>
                      <TableHead>SMS Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => {
                      const results = (alert.sms_results || []) as AlertResult[];
                      const successCount = results.filter(r => r.success).length;
                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="font-mono font-medium">{alert.tracking_number}</TableCell>
                          <TableCell>{alert.courier_name || "—"}</TableCell>
                          <TableCell>{alert.shipment_location || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(alert.created_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell>{statusBadge(alert.sms_status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {successCount}/{results.length} delivered
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
