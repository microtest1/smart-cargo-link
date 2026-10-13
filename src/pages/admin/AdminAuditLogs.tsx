import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Clock, User, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", entityFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (entityFilter && entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filteredLogs = logs?.filter(
    (log: any) =>
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const entityTypes = [...new Set(logs?.map((l: any) => l.entity_type) || [])];

  const getActionColor = (action: string) => {
    if (action?.includes("create") || action?.includes("insert")) return "bg-success/10 text-success";
    if (action?.includes("update") || action?.includes("edit")) return "bg-cargo-blue/10 text-cargo-blue";
    if (action?.includes("delete") || action?.includes("remove")) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const handleExport = () => {
    if (!filteredLogs?.length) return;
    const csv = [
      "Timestamp,User,Role,Action,Entity Type,Entity ID,Details",
      ...filteredLogs.map((log: any) =>
        [
          new Date(log.created_at).toISOString(),
          log.user_email || "System",
          log.user_role || "-",
          log.action,
          log.entity_type,
          log.entity_id || "-",
          JSON.stringify(log.details || {}).replace(/,/g, ";"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredLogs?.length}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Logs Table */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Time</th>
                  <th className="text-left p-4 font-medium text-sm">User</th>
                  <th className="text-left p-4 font-medium text-sm">Action</th>
                  <th className="text-left p-4 font-medium text-sm">Entity</th>
                  <th className="text-left p-4 font-medium text-sm">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                )}
                {!isLoading && !filteredLogs?.length && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No audit logs found. Actions will be recorded as admins use the system.
                    </td>
                  </tr>
                )}
                {filteredLogs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{log.user_email || "System"}</p>
                          {log.user_role && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {log.user_role}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={cn("capitalize", getActionColor(log.action))}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm capitalize">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-xs font-mono text-muted-foreground ml-1">
                            {log.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 100) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
