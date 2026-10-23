import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ExternalLink, Users } from "lucide-react";

export default function Community() {
  const url = "https://ninefit-community-flow.lovable.app";
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
      <div className="flex-1 px-4 grid place-items-center">
        <div className="w-full max-w-lg rounded-2xl border border-primary/20 bg-card p-6 text-center">
          <Users className="mx-auto mb-3 w-8 h-8 text-primary" />
          <h2 className="font-semibold">Comunidade externa</h2>
          <p className="mt-2 text-sm text-muted-foreground">Posts e grupos estão disponíveis no aplicativo da comunidade. A sincronização com seu histórico 9FIT ainda não está confirmada.</p>
          <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"><ExternalLink className="w-3 h-3" /> Abrir comunidade</a>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
