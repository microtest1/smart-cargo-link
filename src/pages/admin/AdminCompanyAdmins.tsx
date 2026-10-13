import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  Shield,
  ShieldOff,
  Eye,
  EyeOff,
  Building2,
  Search,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminCompanyAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Fetch companies with their admin status (using secure view that excludes password_hash)
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["companies-with-admins"],
    queryFn: async () => {
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (companiesError) throw companiesError;
      
      // Use the secure view that excludes password_hash column
      const { data: adminsData, error: adminsError } = await (supabase
        .from("company_admins_safe" as any)
        .select("*") as any);
      if (adminsError) throw adminsError;

      return companiesData.map(company => ({
        ...company,
        admin: (adminsData as any[])?.find((a: any) => a.company_id === company.id),
      }));
    },
  });

  // Fetch login logs with admin and company info
  const { data: loginLogs } = useQuery({
    queryKey: ["company-login-logs"],
    queryFn: async () => {
      // Fetch login logs
      const { data: logsData, error: logsError } = await (supabase
        .from("company_login_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as any);
      if (logsError) throw logsError;
      
      // Fetch admin info from secure view
      const { data: adminsData, error: adminsError } = await (supabase
        .from("company_admins_safe" as any)
        .select("id, username, company_id") as any);
      if (adminsError) throw adminsError;
      
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, name");
      if (companiesError) throw companiesError;
      
      // Manually join the data
      return (logsData as any[]).map((log: any) => {
        const admin = (adminsData as any[])?.find((a: any) => a.id === log.company_admin_id);
        const company = companiesData?.find((c: any) => c.id === admin?.company_id);
        return {
          ...log,
          company_admins: admin ? {
            username: admin.username,
            companies: company ? { name: company.name } : null
          } : null
        };
      });
    },
  });

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.rpc("create_company_admin" as any, {
        p_company_id: companyId,
        p_created_by: user?.id,
      });
      if (error) throw error;
      return (data as any)[0];
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["companies-with-admins"] });
      setCredentials({ username: data.username, password: data.password });
      setShowCredentialsDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const { data, error } = await supabase.rpc("reset_company_admin_password" as any, {
        p_admin_id: adminId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (newPassword: string, adminId: string) => {
      queryClient.invalidateQueries({ queryKey: ["companies-with-admins"] });
      const admin = companies?.find((c: any) => c.admin?.id === adminId)?.admin;
      setCredentials({ username: admin?.username || "", password: newPassword });
      setShowCredentialsDialog(true);
      toast({
        title: "Password Reset",
        description: "New password has been generated. Share it with the company admin.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ adminId, isActive }: { adminId: string; isActive: boolean }) => {
      const { error } = await (supabase
        .from("company_admins" as any)
        .update({ is_active: isActive })
        .eq("id", adminId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-with-admins"] });
      toast({
        title: "Status Updated",
        description: "Company admin status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const filteredCompanies = companies?.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.admin?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Company Administrators">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Company Administrators</h1>
          <p className="text-muted-foreground">Manage company admin accounts and credentials</p>
        </div>

        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Admin Accounts</TabsTrigger>
            <TabsTrigger value="logs">Login Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search companies or usernames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Companies List */}
            {companiesLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCompanies?.map((company) => (
                  <Card key={company.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{company.name}</h3>
                            {company.admin ? (
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-sm bg-muted px-2 py-0.5 rounded">
                                  @{company.admin.username}
                                </code>
                                <Badge variant={company.admin.is_active ? "default" : "destructive"}>
                                  {company.admin.is_active ? "Active" : "Disabled"}
                                </Badge>
                                {company.admin.last_login && (
                                  <span className="text-xs text-muted-foreground">
                                    Last login: {format(new Date(company.admin.last_login), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No admin account</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {company.admin ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPasswordMutation.mutate(company.admin.id)}
                                disabled={resetPasswordMutation.isPending}
                              >
                                <RefreshCw className={cn(
                                  "w-4 h-4 mr-2",
                                  resetPasswordMutation.isPending && "animate-spin"
                                )} />
                                Reset Password
                              </Button>
                              <Button
                                variant={company.admin.is_active ? "destructive" : "default"}
                                size="sm"
                                onClick={() => toggleStatusMutation.mutate({
                                  adminId: company.admin.id,
                                  isActive: !company.admin.is_active,
                                })}
                                disabled={toggleStatusMutation.isPending}
                              >
                                {company.admin.is_active ? (
                                  <>
                                    <ShieldOff className="w-4 h-4 mr-2" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Enable
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => createAdminMutation.mutate(company.id)}
                              disabled={createAdminMutation.isPending}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Create Admin
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Login Activity
                </CardTitle>
                <CardDescription>Last 100 login attempts across all company admins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loginLogs?.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        log.success ? "bg-green-500/5" : "bg-red-500/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          log.success ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                        )}>
                          {log.success ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{log.username}</span>
                            {log.company_admins?.companies?.name && (
                              <span className="text-xs text-muted-foreground">
                                ({log.company_admins.companies.name})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {log.success ? "Successful login" : log.failure_reason || "Failed login"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  ))}
                  {loginLogs?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No login activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Admin Credentials
              </DialogTitle>
              <DialogDescription>
                Copy these credentials and share them securely with the company administrator.
                The password cannot be retrieved again.
              </DialogDescription>
            </DialogHeader>
            
            {credentials && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="flex items-center gap-2">
                    <Input value={credentials.username} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(credentials.username, "Username")}
                    >
                      {copiedField === "Username" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPasswords["dialog"] ? "text" : "password"}
                        value={credentials.password}
                        readOnly
                        className="font-mono pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPasswords(p => ({ ...p, dialog: !p.dialog }))}
                      >
                        {showPasswords["dialog"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(credentials.password, "Password")}
                    >
                      {copiedField === "Password" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowCredentialsDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
