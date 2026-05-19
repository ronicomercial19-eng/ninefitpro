import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { ExternalLink } from "lucide-react";

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
      <div className="flex-1 px-4">
        <iframe
          src={url}
          className="w-full h-[calc(100vh-180px)] rounded-xl border border-white/5 bg-card"
          title="9FIT Community"
          allow="clipboard-write; fullscreen"
        />
      </div>
      <BottomNavigation />
    </div>
  );
}
