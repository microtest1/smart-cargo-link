import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ImageOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

interface PhotoMeta { id: string; content_type: string }

/**
 * Customer photo viewer. The customer must be signed in (ProtectedRoute).
 * The server checks the record belongs to this customer, then streams each image.
 * Images are shown from in-memory blobs — no storage URL ever reaches the browser.
 */
export default function GoodsPhotos() {
  const { recordId } = useParams();
  const [state, setState] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let urls: string[] = [];
    let cancelled = false;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token || !recordId) return setState("denied");
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goods-photo-access`;
      const headers = { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
      try {
        const res = await fetch(`${base}?record=${encodeURIComponent(recordId)}`, { headers });
        if (res.status === 403 || res.status === 404) return setState("denied");
        if (!res.ok) return setState("unavailable");
        const meta = (await res.json()) as { product?: string; photos: PhotoMeta[] };
        setTitle(meta.product || "");
        const loaded: { id: string; url: string }[] = [];
        for (const p of meta.photos) {
          const r = await fetch(`${base}?record=${encodeURIComponent(recordId)}&photo=${encodeURIComponent(p.id)}`, { headers });
          if (!r.ok) continue;
          const url = URL.createObjectURL(await r.blob());
          urls.push(url);
          loaded.push({ id: p.id, url });
        }
        if (!cancelled) { setPhotos(loaded); setState("ready"); }
      } catch {
        setState("unavailable");
      }
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); urls = []; };
  }, [recordId]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link to="/my-cargo"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />My Cargo</Button></Link>
        <h1 className="font-display font-bold text-xl">Your goods photos{title ? ` – ${title}` : ""}</h1>
        {state === "loading" && <Loader2 className="w-6 h-6 animate-spin" />}
        {state === "denied" && <p className="text-muted-foreground">These photos aren't linked to your account. Make sure you're signed in with the account that owns this shipment.</p>}
        {state === "unavailable" && <p className="text-muted-foreground">Photo viewing isn't available yet. Please try again later or contact customer service.</p>}
        {state === "ready" && (photos.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => <img key={p.id} src={p.url} alt="Goods photo" className="w-full aspect-square object-cover rounded-xl border border-border" />)}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground"><ImageOff className="w-4 h-4" />No photos for this record.</p>
        ))}
      </div>
    </AppLayout>
  );
}
