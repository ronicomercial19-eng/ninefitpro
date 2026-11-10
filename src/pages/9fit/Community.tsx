import { useQuery } from "@tanstack/react-query";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ExternalLink, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { COMMUNITY_URL } from "@/lib/communityUrl";

export default function Community() {
  const feed = useQuery({
    queryKey: ["student-community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "community-proxy?action=feed&limit=20",
        { method: "GET" },
      );
      if (error) throw error;
      if (!Array.isArray(data?.items)) return [];
      return data.items as Array<{ id: string; content: string; created_at: string }>;
    },
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-background pb-28 flex flex-col">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label">9FIT • COMMUNITY</p>
            <h1 className="text-display text-2xl mt-1">Tribos & Feed</h1>
          </div>
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> abrir
          </a>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Feed</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={feed.isFetching}
            onClick={() => void feed.refetch()}
          >
            Atualizar
          </Button>
        </div>

        {feed.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando feed…
          </div>
        ) : feed.isError ? (
          <div className="rounded-2xl border border-primary/20 bg-card p-6 text-center">
            <Users className="mx-auto mb-3 w-8 h-8 text-primary" />
            <h2 className="font-semibold">Comunidade indisponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Não foi possível carregar o feed agora. Você pode abrir o app da comunidade.
            </p>
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"
            >
              <ExternalLink className="w-3 h-3" /> Abrir comunidade
            </a>
          </div>
        ) : feed.data && feed.data.length > 0 ? (
          feed.data.map((post) => (
            <article key={post.id} className="rounded-xl border bg-card p-4">
              <p className="whitespace-pre-wrap text-sm">{post.content}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {new Date(post.created_at).toLocaleString("pt-BR")}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-card p-6 text-center">
            <Users className="mx-auto mb-3 w-8 h-8 text-primary" />
            <h2 className="font-semibold">Nenhuma publicação ainda</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando houver posts na comunidade, eles aparecem aqui.
            </p>
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"
            >
              <ExternalLink className="w-3 h-3" /> Abrir comunidade
            </a>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
