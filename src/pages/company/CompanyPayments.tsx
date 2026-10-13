import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CompanyPayments() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();

  // Fetch delivery requests (which contain payment info)
  const { data: deliveryRequests, isLoading } = useQuery({
    queryKey: ["company-payments", session?.companyId],
    queryFn: async () => {
      // First get shipments for this company
      const { data: shipments, error: shipmentError } = await supabase
        .from("shipments")
        .select("id, user_code")
        .eq("company_id", session!.companyId);

      if (shipmentError) throw shipmentError;

      const shipmentIds = shipments.map((s) => s.id);

      // Then get delivery requests for those shipments
      const { data: requests, error } = await supabase
        .from("delivery_requests")
        .select("*, delivery_locations(*)")
        .in("shipment_id", shipmentIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return requests;
    },
    enabled: !!session?.companyId,
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return CheckCircle;
      case "pending":
        return Clock;
      case "failed":
        return AlertCircle;
      default:
        return CreditCard;
    }
  };

  const totalPending = deliveryRequests?.filter(
    (r) => r.payment_status === "pending"
  ).length || 0;
  
  const totalPaid = deliveryRequests?.filter(
    (r) => r.payment_status === "paid"
  ).length || 0;

  const totalAmount = deliveryRequests?.reduce(
    (sum, r) => sum + (r.amount || 0),
    0
  ) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/company-admin")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">Payments</h1>
            <p className="text-xs text-muted-foreground">
              Track delivery payments
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-accent mx-auto mb-2" />
              <p className="text-xl font-bold">GH₵ {totalAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-xl font-bold">{totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xl font-bold">{totalPaid}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : deliveryRequests && deliveryRequests.length > 0 ? (
          <div className="space-y-3">
            {deliveryRequests.map((request) => {
              const StatusIcon = getPaymentStatusIcon(request.payment_status);
              return (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{request.user_code}</span>
                            <Badge
                              variant="secondary"
                              className={`${getPaymentStatusColor(
                                request.payment_status
                              )} text-white text-xs`}
                            >
                              {request.payment_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          GH₵ {(request.amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {request.status}
                        </p>
                      </div>
                    </div>
                    {request.notes && (
                      <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
                        {request.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Payment Records</h3>
              <p className="text-sm text-muted-foreground">
                Payment records will appear here when customers request deliveries
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
