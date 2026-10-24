import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import { Button } from "@/components/ui/button";
import {
  loadHealthFlixCatalog,
  type HealthVideo,
} from "@/services/healthFlixCatalog";
import { toast } from "sonner";
export default function HealthFlixAdminPage() {
  const qc = useQueryClient(),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<any>(null);
  const q = useQuery({
    queryKey: ["healthflix-catalog"],
    queryFn: loadHealthFlixCatalog,
  });
  async function save(hidden = false, video?: HealthVideo) {
    if (busy) return;
    setBusy(true);
    try {
      const row = video
        ? {
            external_id: video.external_id,
            name: video.title,
            thumbnail_url: video.thumbnail || null,
            player_url: video.video_url || null,
            category: video.category || null,
            payload: {
              ...(video.payload || {}),
              fitpro_hidden: hidden,
              fitpro_override: true,
            },
          }
        : {
            ...editing,
            payload: {
              ...(editing.payload || {}),
              fitpro_hidden: false,
              fitpro_override: true,
            },
          };
      if (!row.external_id?.trim() || !row.name?.trim())
        throw new Error("ID e nome obrigatórios.");
      if (!hidden) {
        const u = new URL(row.player_url);
        if (u.protocol !== "https:" || u.username || u.password)
          throw new Error("Informe uma URL HTTPS de vídeo válida.");
      }
      const { data, error } = await supabase
        .from("library_items")
        .upsert(
          { ...row, type: "videos", synced_at: new Date().toISOString() },
          { onConflict: "type,external_id" },
        )
        .select("id")
        .single();
      if (error || !data) throw error || new Error("Gravação não confirmada.");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["healthflix-catalog"] });
      toast.success(
        hidden
          ? "Conteúdo ocultado do catálogo FitPro."
          : "Vídeo publicado no catálogo compartilhado com o aluno.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">HealthFlix</h1>
      <p>
        Este é o catálogo efetivo usado pelo aluno: conteúdo externo e
        publicações locais. Ocultar atua no FitPro; não exclui o original do
        provedor.
      </p>
      <ApiConnectorCard
        moduleKey="healthflix"
        title="HealthFlix API"
        description="Configuração administrativa e verificação da integração externa."
        healthPath="/fitpro-health"
      />
      <div className="flex gap-2">
        <Button
          disabled={busy || q.isFetching}
          onClick={() => void q.refetch()}
        >
          Atualizar catálogo
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            setEditing({
              external_id: `manual-${crypto.randomUUID()}`,
              name: "",
              player_url: "",
              thumbnail_url: "",
              category: "geral",
            })
          }
        >
          Novo vídeo
        </Button>
      </div>
      {editing && (
        <section className="rounded border p-4 space-y-3">
          {[
            ["Nome", "name"],
            ["URL HTTPS do vídeo", "player_url"],
            ["Imagem", "thumbnail_url"],
            ["Categoria", "category"],
          ].map(([label, key]) => (
            <label key={key} className="block">
              {label}
              <input
                disabled={busy}
                value={editing[key] || ""}
                onChange={(e) =>
                  setEditing({ ...editing, [key]: e.target.value })
                }
                className="block w-full rounded border bg-background p-2"
              />
            </label>
          ))}
          <Button disabled={busy} onClick={() => void save()}>
            Publicar
          </Button>{" "}
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => setEditing(null)}
          >
            Cancelar
          </Button>
        </section>
      )}
      {q.isError ? (
        <p role="alert">
          {(q.error as Error).message}{" "}
          <Button onClick={() => void q.refetch()}>Tentar novamente</Button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando…</p>
      ) : (
        <>
          <p>
            {q.data?.externalAvailable
              ? "Catálogo externo carregado."
              : "Provedor externo indisponível. Exibindo publicações locais."}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {q.data?.items.map((v) => (
              <article
                key={v.external_id}
                className="rounded border p-4 space-y-3"
              >
                <h2>{v.title}</h2>
                <p>{v.category}</p>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      external_id: v.external_id,
                      name: v.title,
                      player_url: v.video_url,
                      thumbnail_url: v.thumbnail,
                      category: v.category,
                      payload: v.payload,
                    })
                  }
                >
                  Editar no FitPro
                </Button>{" "}
                <Button
                  disabled={busy}
                  variant="destructive"
                  onClick={() => {
                    if (
                      window.confirm(`Ocultar ${v.title} do catálogo do aluno?`)
                    )
                      void save(true, v);
                  }}
                >
                  Ocultar
                </Button>
              </article>
            ))}
          </div>
          {!!q.data?.hiddenItems.length && (
            <section className="space-y-3 rounded border p-4">
              <h2 className="font-semibold">Ocultados no FitPro</h2>
              {q.data.hiddenItems.map((v) => (
                <div
                  key={v.external_id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span>{v.title}</span>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        external_id: v.external_id,
                        name: v.title,
                        player_url: v.video_url,
                        thumbnail_url: v.thumbnail,
                        category: v.category,
                        payload: v.payload,
                      })
                    }
                  >
                    Revisar e republicar
                  </Button>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
