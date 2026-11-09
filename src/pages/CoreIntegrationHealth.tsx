import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export default function CoreIntegrationHealth() {
  const [result, setResult] = useState<unknown>({ status: "checking" });
  const [batch, setBatch] = useState<{ processed?: number; skipped?: number; next_cursor?: string | null; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void supabase.functions.invoke("core-os-dispatch?action=health", { method: "GET" }).then(async ({ data, error }) => {
      const response = (error as { context?: Response } | null)?.context;
      const value = error ? response instanceof Response ? await response.json().catch(() => ({ status: response.status })) : { status: 503 } : data;
      if (!cancelled) setResult(value);
    });
    return () => { cancelled = true; };
  }, []);
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-4">
    <h1 className="text-xl">Conexão FitPro ↔ Core</h1><pre>{JSON.stringify(result, null, 2)}</pre>
    {(result as { status?: number })?.status === 200 && <>
      <p>Prepare as conversas dos alunos com telefone cadastrado, em lotes de 25.</p>
      <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy || batch?.next_cursor === null} onClick={async () => {
        setBusy(true);
        try {
          const r = await supabase.functions.invoke("core-os-dispatch?action=backfill", { body: { after: batch?.next_cursor || undefined } });
          if (r.error) throw new Error("backfill_failed");
          setBatch(r.data);
        } catch { setBatch(previous => ({ ...previous, error: "Não foi possível preparar as conversas. Tente novamente." })); }
        finally { setBusy(false); }
      }}>{busy ? "Preparando…" : batch?.next_cursor ? "Preparar próximo lote" : "Preparar conversas existentes"}</button>
      {batch && <p role={batch.error ? "alert" : "status"}>{batch.error || (String(batch.processed ?? 0) + " conversas preparadas; " + String(batch.skipped ?? 0) + " cadastros precisam revisar o telefone.")}</p>}
    </>}
  </main>;
}

