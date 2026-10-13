import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SERVICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hubtel-ussd-service-interaction`;
const FULFILL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hubtel-ussd-fulfillment`;

type LogRow = {
  id: string;
  endpoint_type: string;
  session_id: string | null;
  mobile_number_masked: string | null;
  request_payload: any;
  response_payload: any;
  http_status: number | null;
  processing_status: string | null;
  error_message: string | null;
  created_at: string;
};

export default function AdminHubtelUssdUat() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");
  const [siStatus, setSiStatus] = useState<string>("Unknown");
  const [ffStatus, setFfStatus] = useState<string>("Unknown");
  const [testMessage, setTestMessage] = useState("1");
  const [testTracking, setTestTracking] = useState("TRK-000001");
  const [testOutput, setTestOutput] = useState<string>("");

  async function loadLogs() {
    const query = supabase.from("hubtel_ussd_logs").select("*").order("created_at", { ascending: false }).limit(100);
    const { data, error } = filter
      ? await query.ilike("session_id", `%${filter}%`)
      : await query;
    if (error) { toast.error(error.message); return; }
    setLogs((data ?? []) as LogRow[]);
  }

  async function pingEndpoint(url: string, setStatus: (v: string) => void) {
    try {
      const r = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SessionId: `ping-${Date.now()}`, Type: "Release" }),
      });
      setStatus(r.ok ? `Ready (HTTP ${r.status})` : `Error (HTTP ${r.status})`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : "unreachable"}`);
    }
  }

  async function runInternalTest() {
    setTestOutput("Running…");
    const sid = `test-${Date.now()}`;
    try {
      const initRes = await fetch(SERVICE_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SessionId: sid, Mobile: "233200000000", ServiceCode: "*713*12345#", Type: "Initiation", Sequence: 1, Message: "" }),
      });
      const initJson = await initRes.json();

      const menuRes = await fetch(SERVICE_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SessionId: sid, Mobile: "233200000000", ServiceCode: "*713*12345#", Type: "Response", Sequence: 2, Message: testMessage, ClientState: "menu" }),
      });
      const menuJson = await menuRes.json();

      let trackRes: any = null;
      if (testMessage === "1") {
        const r = await fetch(SERVICE_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ SessionId: sid, Mobile: "233200000000", ServiceCode: "*713*12345#", Type: "Response", Sequence: 3, Message: testTracking, ClientState: "await_tracking" }),
        });
        trackRes = await r.json();
      }
      setTestOutput(JSON.stringify({ initiation: initJson, menu: menuJson, follow_up: trackRes }, null, 2));
      loadLogs();
    } catch (e) {
      setTestOutput(`Test error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    loadLogs();
    pingEndpoint(SERVICE_URL, setSiStatus);
    pingEndpoint(FULFILL_URL, setFfStatus);
  }, []);

  const latest = logs[0];

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Hubtel USSD UAT</h1>
          <p className="text-muted-foreground">Programmable Services test console for *713*12345#</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Endpoint Status</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between"><span>Service Interaction:</span><Badge variant={siStatus.startsWith("Ready") ? "default" : "destructive"}>{siStatus}</Badge></div>
            <div className="flex justify-between"><span>Fulfillment:</span><Badge variant={ffStatus.startsWith("Ready") ? "default" : "destructive"}>{ffStatus}</Badge></div>
            <div className="flex justify-between"><span>JWT Requirement:</span><Badge>Disabled for Hubtel endpoints</Badge></div>
            <div className="flex justify-between"><span>Latest Request:</span><span>{latest ? new Date(latest.created_at).toLocaleString() : "—"}</span></div>
            <div className="flex justify-between"><span>Latest Response Status:</span><span>{latest?.http_status ?? "—"}</span></div>
            <div className="pt-2 space-y-1 text-xs break-all">
              <div><b>SI URL:</b> {SERVICE_URL}</div>
              <div><b>Fulfillment URL:</b> {FULFILL_URL}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Internal Simulation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Simulates Hubtel's documented request format. This is NOT an actual Hubtel test — it only checks that our endpoints respond correctly.</p>
            <div className="flex gap-2">
              <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Menu choice (1/2/3)" className="w-40" />
              <Input value={testTracking} onChange={(e) => setTestTracking(e.target.value)} placeholder="Tracking code" />
              <Button onClick={runInternalTest}>Run test</Button>
            </div>
            {testOutput && <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{testOutput}</pre>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <div className="flex gap-2 pt-2">
              <Input placeholder="Filter by session id" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <Button variant="outline" onClick={loadLogs}>Refresh</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="border rounded p-3 text-xs space-y-2">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{l.endpoint_type}</Badge>
                    <Badge variant={l.processing_status === "ok" ? "default" : "destructive"}>{l.processing_status}</Badge>
                    <span>HTTP {l.http_status}</span>
                    <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-muted-foreground">Session: {l.session_id ?? "—"} · {l.mobile_number_masked ?? "—"}</div>
                </div>
                <details><summary className="cursor-pointer">Request</summary><pre className="mt-2 bg-muted p-2 rounded overflow-auto">{JSON.stringify(l.request_payload, null, 2)}</pre></details>
                <details><summary className="cursor-pointer">Response</summary><pre className="mt-2 bg-muted p-2 rounded overflow-auto">{JSON.stringify(l.response_payload, null, 2)}</pre></details>
                {l.error_message && <div className="text-destructive">Error: {l.error_message}</div>}
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-muted-foreground">No logs yet.</p>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
