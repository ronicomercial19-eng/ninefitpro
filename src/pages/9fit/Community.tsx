import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ExternalLink, Users, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Community() {
  const url = "https://ninefit-community-flow.lovable.app";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: result, error: invokeError } = await supabase.functions.invoke("community-proxy?action=feed", { method: "GET" });
      if (!active) return;
      if (invokeError) setError("Não foi possível carregar o feed da comunidade.");
      else setData(result);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);
  return (
    <div className="min-h-screen bg-background pb-28 flex flex-col">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label">9FIT • COMMUNITY</p>
            <h1 className="text-display text-2xl mt-1">Tribos & Feed</h1>
          </div>
          <a href={url} target="_blank" rel="noreferrer"
             className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> abrir
          </a>
        </div>
      </div>
      <div className="flex-1 px-4">
        <div className="w-full max-w-2xl mx-auto rounded-2xl border border-primary/20 bg-card p-6">
          <Users className="mx-auto mb-3 w-8 h-8 text-primary" />
          <h2 className="font-semibold text-center">Community via API</h2>
          {loading && <p className="mt-2 text-sm text-muted-foreground text-center">Carregando feed…</p>}
          {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
          {!loading && !error && <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>}
          <div className="mt-4 flex justify-center gap-4">
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 text-sm text-primary"><RefreshCw className="w-3 h-3" /> Atualizar</button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary underline"><ExternalLink className="w-3 h-3" /> Abrir comunidade</a>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
