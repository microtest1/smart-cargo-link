import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useCompanySupabase } from "@/hooks/useCompanySupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Save,
  User,
} from "lucide-react";

export default function CompanySettings() {
  const { session } = useCompanyAuth();
  const supabase = useCompanySupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    manager_name: "",
    phone: "",
    phone2: "",
    email: "",
    customer_service_email: "",
    whatsapp: "",
    china_warehouse_address: "",
    ghana_warehouse_address: "",
    services: "",
  });

  // Fetch company data
  const { data: company, isLoading } = useQuery({
    queryKey: ["company", session?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", session!.companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.companyId,
  });

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        manager_name: company.manager_name || "",
        phone: company.phone || "",
        phone2: company.phone2 || "",
        email: company.email || "",
        customer_service_email: company.customer_service_email || "",
        whatsapp: company.whatsapp || "",
        china_warehouse_address: company.china_warehouse_address || "",
        ghana_warehouse_address: company.ghana_warehouse_address || "",
        services: company.services || "",
      });
    }
  }, [company]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("companies")
        .update({
          manager_name: data.manager_name,
          phone: data.phone,
          phone2: data.phone2,
          email: data.email,
          customer_service_email: data.customer_service_email,
          whatsapp: data.whatsapp,
          china_warehouse_address: data.china_warehouse_address,
          ghana_warehouse_address: data.ghana_warehouse_address,
          services: data.services,
        })
        .eq("id", session!.companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({
        title: "Settings Updated",
        description: "Company information has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/company-admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">Company Settings</h1>
            <p className="text-xs text-muted-foreground">Update your company information</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your company's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Company name cannot be changed. Contact Super Admin if needed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_name">Manager Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => handleChange("manager_name", e.target.value)}
                    className="pl-10"
                    placeholder="Enter manager name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Primary Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="pl-10"
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone2">Secondary Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone2"
                      value={formData.phone2}
                      onChange={(e) => handleChange("phone2", e.target.value)}
                      className="pl-10"
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="pl-10"
                      placeholder="company@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_service_email">Customer Service Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="customer_service_email"
                      type="email"
                      value={formData.customer_service_email}
                      onChange={(e) => handleChange("customer_service_email", e.target.value)}
                      className="pl-10"
                      placeholder="support@example.com"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    className="pl-10"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Warehouse Addresses
              </CardTitle>
              <CardDescription>Your warehouse locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="china_warehouse_address">China Warehouse Address</Label>
                <Textarea
                  id="china_warehouse_address"
                  value={formData.china_warehouse_address}
                  onChange={(e) => handleChange("china_warehouse_address", e.target.value)}
                  placeholder="Enter your China warehouse address"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ghana_warehouse_address">Ghana Warehouse Address</Label>
                <Textarea
                  id="ghana_warehouse_address"
                  value={formData.ghana_warehouse_address}
                  onChange={(e) => handleChange("ghana_warehouse_address", e.target.value)}
                  placeholder="Enter your Ghana warehouse address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
              <CardDescription>Describe the services your company provides</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.services}
                onChange={(e) => handleChange("services", e.target.value)}
                placeholder="e.g., Air Freight, Sea Freight, Door-to-Door Delivery..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
