import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChinaWarehouses, useCreateChinaWarehouse, useDeleteChinaWarehouse } from "@/hooks/useChinaWarehouses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const warehouseSchema = z.object({
  warehouse_name: z.string().min(1, "Warehouse name is required").max(100),
  full_address: z.string().min(5, "Full address is required").max(500),
  contact_person: z.string().max(100).optional(),
  phone_number: z.string().max(20).optional(),
  company_id: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

export function ChinaWarehouseForm() {
  const [showForm, setShowForm] = useState(false);
  const { warehouses, isLoading } = useChinaWarehouses();
  const createWarehouse = useCreateChinaWarehouse();
  const deleteWarehouse = useDeleteChinaWarehouse();

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, china_warehouse_address")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      warehouse_name: "",
      full_address: "",
      contact_person: "",
      phone_number: "",
      company_id: "",
    },
  });

  const onSubmit = async (data: WarehouseFormData) => {
    await createWarehouse.mutateAsync({
      warehouse_name: data.warehouse_name,
      full_address: data.full_address,
      contact_person: data.contact_person || null,
      phone_number: data.phone_number || null,
      company_id: data.company_id || null,
    });
    form.reset();
    setShowForm(false);
  };

  const handleCompanySelect = (companyId: string) => {
    const company = companies?.find((c) => c.id === companyId);
    if (company) {
      form.setValue("company_id", companyId);
      form.setValue("warehouse_name", `${company.name} Warehouse`);
      form.setValue("full_address", company.china_warehouse_address);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse className="w-5 h-5" />
          China Warehouse
        </CardTitle>
        <CardDescription>
          Save the China warehouse address where your goods are located
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing warehouses */}
        {warehouses.length > 0 && (
          <div className="space-y-3">
            {warehouses.map((warehouse: any) => (
              <div
                key={warehouse.id}
                className="p-4 bg-muted rounded-lg flex justify-between items-start"
              >
                <div>
                  <h4 className="font-medium">{warehouse.warehouse_name}</h4>
                  <p className="text-sm text-muted-foreground">{warehouse.full_address}</p>
                  {warehouse.contact_person && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {warehouse.contact_person} {warehouse.phone_number && `(${warehouse.phone_number})`}
                    </p>
                  )}
                  {warehouse.companies?.name && (
                    <p className="text-xs text-primary mt-1">
                      Company: {warehouse.companies.name}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteWarehouse.mutate(warehouse.id)}
                  disabled={deleteWarehouse.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new warehouse form */}
        {showForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Logistics Company (Optional)</FormLabel>
                    <Select onValueChange={handleCompanySelect} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company to autofill" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Guangzhou Main Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full China Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter complete warehouse address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+86..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createWarehouse.isPending}>
                  {createWarehouse.isPending ? "Saving..." : "Save Warehouse"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add China Warehouse
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
