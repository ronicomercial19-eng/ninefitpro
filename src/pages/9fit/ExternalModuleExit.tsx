import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EXTERNAL_MODULES, type ExternalModuleKey } from "@/lib/moduleUrls";
import { safeExternalAppUrl } from "@/lib/externalApps";

/** Página de saída para módulos externos: abre o destino oficial em nova aba, sem encaminhar tokens. */
export default function ExternalModuleExit({ moduleKey }: { moduleKey: ExternalModuleKey }) {
  const navigate = useNavigate();
  const mod = EXTERNAL_MODULES[moduleKey];
  const href = safeExternalAppUrl(mod.url);

  return (
    <div className="px-4 pt-20 pb-28 max-w-lg mx-auto">
      <section className="nine-card p-6">
        <p className="nine-label">{mod.label}</p>
        <h1 className="nine-title text-3xl mt-2">{mod.title}</h1>
        <p className="text-sm text-muted-foreground mt-3">{mod.description} Abre em uma nova aba, fora do app.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="nine-btn">
              Abrir {mod.title} <ArrowUpRight className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-sm text-destructive">Destino indisponível no momento.</p>
          )}
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/9fit/hub"))} className="nine-btn-outline">
            Voltar
          </button>
        </div>
      </section>
    </div>
  );
}
