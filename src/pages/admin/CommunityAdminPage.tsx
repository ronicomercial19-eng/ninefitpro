import { ExternalLink, Users } from "lucide-react";

const COMMUNITY_URL = "https://ninefit-community-flow.lovable.app";

export default function CommunityAdminPage() {
  return <div className="space-y-5">
    <div className="flex items-center justify-between">
      <div><h1 className="text-3xl font-display flex items-center gap-3"><Users className="w-7 h-7 text-primary" /> Comunidade 9FIT</h1><p className="text-sm text-muted-foreground mt-1">Acompanhe e administre as tribos e interações do ecossistema.</p></div>
      <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Abrir módulo</a>
    </div>
    <div className="rounded-xl border border-primary/20 bg-card p-8 text-center">
      <Users className="mx-auto mb-3 w-8 h-8 text-primary" />
      <h2 className="font-semibold">Community via API</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">O painel operacional será carregado pelas rotas REST do Community assim que a API Key estiver cadastrada no conector do FitPro.</p>
      <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"><ExternalLink className="w-3 h-3" /> Abrir temporariamente</a>
    </div>
  </div>;
}
