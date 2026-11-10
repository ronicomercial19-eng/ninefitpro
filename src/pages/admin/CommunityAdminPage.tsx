import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { functionErrorMessage } from "@/lib/functionError";
import { ExternalLink, Users } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import { COMMUNITY_URL } from "@/lib/communityUrl";
export default function CommunityAdminPage() {
  const feed = useQuery({
    queryKey: ["professor-community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("community-proxy?action=feed&limit=20", { method: "GET" });
      if (error) {
        const details = await error.context?.json?.().catch(() => null);
        throw new Error(functionErrorMessage(details, "Não foi possível carregar a comunidade."));
      }
      if (!Array.isArray(data?.items)) throw new Error("Resposta da comunidade inválida.");
      return data.items as Array<{id: string; content: string; created_at: string}>;
    },
  });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold flex gap-2">
        <Users />
        Comunidade 9FIT
      </h1>
      <p>
        A gestão de tribos e interações acontece no módulo Comunidade. Ele abre
        em outra aba; este painel permanece aberto para continuar o
        acompanhamento do aluno.
      </p>
      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex gap-2 text-primary underline"
      >
        <ExternalLink />
        Abrir gestão da Comunidade
      </a>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Feed da comunidade</h2><Button variant="outline" disabled={feed.isFetching} onClick={() => void feed.refetch()}>Atualizar</Button></div>
        {feed.isLoading ? <p>Carregando…</p> : feed.isError ? <p role="alert">{feed.error.message}</p> : feed.data?.length ? feed.data.map(post => <article key={post.id} className="rounded-xl border bg-card p-4"><p className="whitespace-pre-wrap">{post.content}</p></article>) : <p>Nenhuma publicação disponível.</p>}
      </section>
      <ApiConnectorCard
        moduleKey="community"
        title="Comunidade API"
        healthPath="/community/groups"
        description="Configuração da integração. Uma chave cadastrada não importa automaticamente tribos ou interações para este painel."
      />
      <p className="text-sm text-muted-foreground">
        As permissões e o login são validados pelo módulo externo. Dados de
        acesso do FitPro não são enviados pela URL.
      </p>
    </div>
  );
}
