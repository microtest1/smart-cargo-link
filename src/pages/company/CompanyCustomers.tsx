import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, User, Package, Mail, Phone } from "lucide-react";
import { useState } from "react";

export default function CompanyCustomers() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch unique customers from shipments for this company
  const { data: customers, isLoading } = useQuery({
    queryKey: ["company-customers", session?.companyId],
    queryFn: async () => {
      // Get unique user codes from shipments
      const { data: shipments, error } = await supabase
        .from("shipments")
        .select("user_code")
        .eq("company_id", session!.companyId);

      if (error) throw error;

      // Get unique user codes
      const uniqueCodes = [...new Set(shipments.map((s) => s.user_code))];

      // Fetch profile info for each code
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("unique_code", uniqueCodes);

      if (profileError) throw profileError;

      // Get shipment counts per user
      const customerData = profiles.map((profile) => {
        const shipmentCount = shipments.filter(
          (s) => s.user_code === profile.unique_code
        ).length;
        return { ...profile, shipmentCount };
      });

      return customerData;
    },
    enabled: !!session?.companyId,
  });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.unique_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="font-display font-bold text-lg">Customers</h1>
            <p className="text-xs text-muted-foreground">
              View customers who use your services
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Customers
              </span>
              <span className="text-2xl font-bold">{customers?.length || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {customer.full_name}
                        </h3>
                        <span className="px-2 py-0.5 bg-muted text-xs rounded-full">
                          {customer.unique_code}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3" />
                          <span>{customer.shipmentCount} shipments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Customers Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No customers match your search"
                  : "Customers will appear here when you create shipments"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
