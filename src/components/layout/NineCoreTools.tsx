import { ExternalLink, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const tools = [
  {
    label: "Video AI Engineer",
    description: "Abra a ferramenta de produção de vídeo do ecossistema Nine.",
    endpoint: import.meta.env.VITE_NINE_VIDEO_AI_URL,
    icon: Video,
  },
  {
    label: "HTML PDF",
    description: "Abra o portal para preparar documentos em PDF.",
    endpoint: import.meta.env.VITE_NINE_HTML_PDF_URL,
    icon: FileText,
  },
];

function launchUrl(endpoint: string | undefined) {
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function NineCoreTools({ collapsed }: { collapsed: boolean }) {
  return tools.map(({ label, description, endpoint, icon: Icon }) => {
    const url = launchUrl(endpoint);
    return (
      <SidebarMenuItem key={label}>
        <Sheet>
          <SheetTrigger asChild>
            <SidebarMenuButton type="button" title={label} aria-label={label}>
              <Icon aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
            </SidebarMenuButton>
          </SheetTrigger>
          <SheetContent className="nine-core-tool-sheet space-y-5">
            <p className="nine-core-kicker">Ferramentas do Nine Core</p>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
            {url ? (
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Abrir ferramenta <ExternalLink aria-hidden="true" />
                  <span className="sr-only">(nova aba)</span>
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ferramenta aguardando configuração neste ambiente.</p>
            )}
          </SheetContent>
        </Sheet>
      </SidebarMenuItem>
    );
  });
}
