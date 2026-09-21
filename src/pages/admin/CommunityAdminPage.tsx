import { ExternalLink, Users } from "lucide-react";

const COMMUNITY_URL = "https://ninefit-community-flow.lovable.app";

export default function CommunityAdminPage() {
  return <div className="space-y-5">
    <div className="flex items-center justify-between">
      <div><h1 className="text-3xl font-display flex items-center gap-3"><Users className="w-7 h-7 text-primary" /> Comunidade 9FIT</h1><p className="text-sm text-muted-foreground mt-1">Acompanhe e administre as tribos e interações do ecossistema.</p></div>
      <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Abrir módulo</a>
    </div>
    <iframe src={COMMUNITY_URL} title="9FIT Community professor" className="w-full h-[calc(100vh-190px)] rounded-xl border border-border bg-card" allow="clipboard-write; fullscreen" />
  </div>;
}
