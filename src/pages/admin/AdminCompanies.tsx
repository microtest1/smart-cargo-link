import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Phone, Mail, Plus, Edit2, Trash2, Loader2, Search } from "lucide-react";

interface CompanyForm {
  name: string;
  manager_name: string;
  email: string;
  phone: string;
  phone2: string;
  whatsapp: string;
  china_warehouse_address: string;
  ghana_warehouse_address: string;
  services: string;
  customer_service_email: string;
}

const initialForm: CompanyForm = {
  name: "",
  manager_name: "",
  email: "",
  phone: "",
  phone2: "",
  whatsapp: "",
  china_warehouse_address: "",
  ghana_warehouse_address: "",
  services: "",
  customer_service_email: "",
};

export default function AdminCompanies() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CompanyForm) => {
      const { error } = await supabase.from("companies").insert({
        name: data.name,
        manager_name: data.manager_name,
        email: data.email,
        phone: data.phone,
        phone2: data.phone2 || null,
        whatsapp: data.whatsapp || null,
        china_warehouse_address: data.china_warehouse_address,
        ghana_warehouse_address: data.ghana_warehouse_address,
        services: data.services || null,
        customer_service_email: data.customer_service_email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company created successfully" });
      setIsDialogOpen(false);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating company", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyForm }) => {
      const { error } = await supabase
        .from("companies")
        .update({
          name: data.name,
          manager_name: data.manager_name,
          email: data.email,
          phone: data.phone,
          phone2: data.phone2 || null,
          whatsapp: data.whatsapp || null,
          china_warehouse_address: data.china_warehouse_address,
          ghana_warehouse_address: data.ghana_warehouse_address,
          services: data.services || null,
          customer_service_email: data.customer_service_email || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company updated successfully" });
      setIsDialogOpen(false);
      setEditingId(null);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating company", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting company", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (company: any) => {
    setEditingId(company.id);
    setForm({
      name: company.name,
      manager_name: company.manager_name,
      email: company.email,
      phone: company.phone,
      phone2: company.phone2 || "",
      whatsapp: company.whatsapp || "",
      china_warehouse_address: company.china_warehouse_address,
      ghana_warehouse_address: company.ghana_warehouse_address,
      services: company.services || "",
      customer_service_email: company.customer_service_email || "",
    });
    setIsDialogOpen(true);
  };

  const filteredCompanies = companies?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.manager_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="Companies">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setForm(initialForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Company" : "Create New Company"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Manager Name *</Label>
                  <Input
                    value={form.manager_name}
                    onChange={(e) => setForm((p) => ({ ...p, manager_name: e.target.value }))}
                    placeholder="Manager name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="company@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Service Email</Label>
                    <Input
                      type="email"
                      value={form.customer_service_email}
                      onChange={(e) => setForm((p) => ({ ...p, customer_service_email: e.target.value }))}
                      placeholder="support@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+233 XXX XXX XXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone 2</Label>
                    <Input
                      value={form.phone2}
                      onChange={(e) => setForm((p) => ({ ...p, phone2: e.target.value }))}
                      placeholder="+233 XXX XXX XXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+233 XXX XXX XXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label>China Warehouse Address *</Label>
                  <Textarea
                    value={form.china_warehouse_address}
                    onChange={(e) => setForm((p) => ({ ...p, china_warehouse_address: e.target.value }))}
                    placeholder="Full address in China"
                    rows={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ghana Warehouse Address *</Label>
                  <Textarea
                    value={form.ghana_warehouse_address}
                    onChange={(e) => setForm((p) => ({ ...p, ghana_warehouse_address: e.target.value }))}
                    placeholder="Full address in Ghana"
                    rows={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Services</Label>
                  <Textarea
                    value={form.services}
                    onChange={(e) => setForm((p) => ({ ...p, services: e.target.value }))}
                    placeholder="Services offered..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" className="flex-1" disabled={isPending}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Update" : "Create"} Company
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Companies Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading && (
            <div className="col-span-2 p-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          )}
          {!isLoading && filteredCompanies?.length === 0 && (
            <div className="col-span-2 p-8 text-center text-muted-foreground">
              No companies found
            </div>
          )}
          {filteredCompanies?.map((company) => (
            <div
              key={company.id}
              className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden"
            >
              <div className="gradient-hero p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-primary-foreground">
                        {company.name}
                      </h3>
                      <p className="text-sm text-primary-foreground/70">
                        Manager: {company.manager_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="iconSm" 
                      className="text-primary-foreground hover:bg-white/20"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="iconSm" 
                      className="text-primary-foreground hover:bg-white/20"
                      onClick={() => setDeleteId(company.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {company.services && (
                  <p className="text-sm text-muted-foreground">{company.services}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{company.phone}</span>
                    {company.phone2 && <span>/ {company.phone2}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{company.email}</span>
                  </div>
                </div>
                <div className="pt-2 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cargo-orange mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">China Warehouse</p>
                      <p className="line-clamp-2">{company.china_warehouse_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cargo-teal mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ghana Warehouse</p>
                      <p className="line-clamp-2">{company.ghana_warehouse_address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company? This will also delete all associated shipments and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}