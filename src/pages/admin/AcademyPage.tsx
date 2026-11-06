import { GraduationCap, ExternalLink } from "lucide-react";

const ACADEMY_URL = "https://ninetyfit-academy-forge.lovable.app";

export default function AcademyPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-primary" />
            Academy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Formações, cursos e certificados do professor. Dona: NINE CORE.
          </p>
        </div>
        <a
          href={ACADEMY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary underline"
        >
          <ExternalLink className="w-4 h-4" /> abrir em nova aba
        </a>
      </div>

      <div className="rounded-xl border overflow-hidden bg-card" style={{ minHeight: "72vh" }}>
        <iframe
          title="NineFit Academy"
          src={ACADEMY_URL}
          className="w-full border-0"
          style={{ minHeight: "72vh" }}
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
