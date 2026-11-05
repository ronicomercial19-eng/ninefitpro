import { Link, useLocation } from "react-router-dom";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";

const destinations = [
  { label: "Ficha", path: "/app/acompanhamento" },
  { label: "Periodização", path: "/app/smart-periodizer" },
  { label: "Prescrever treino", path: "/app/assistente-ia" },
];

function clearMagnet(nav: HTMLElement) {
  nav.querySelectorAll("a").forEach((link) => {
    link.style.removeProperty("--nine-core-magnet-x");
    link.style.removeProperty("--nine-core-magnet-y");
  });
}
export function ProfessorQuickActions() {
  const workspace = useProfessorWorkspace();
  const { pathname } = useLocation();

  if (!workspace.athleteId) return null;

  return (
    <nav
      aria-label="Atalhos do aluno"
      className="nine-core-student-actions"
      onPointerLeave={(event) => clearMagnet(event.currentTarget)}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
        for (const link of event.currentTarget.querySelectorAll("a")) {
          const rect = link.getBoundingClientRect();
          const dx = Math.max(rect.left - event.clientX, event.clientX - rect.right, 0);
          const dy = Math.max(rect.top - event.clientY, event.clientY - rect.bottom, 0);
          const nearby = Math.hypot(dx, dy) <= 12;
          const offset = (delta: number) => nearby ? Math.max(-2, Math.min(2, delta / 14)) : 0;
          link.style.setProperty("--nine-core-magnet-x", `${offset(event.clientX - (rect.left + rect.width / 2))}px`);
          link.style.setProperty("--nine-core-magnet-y", `${offset(event.clientY - (rect.top + rect.height / 2))}px`);
        }
      }}
    >
      {destinations.map(({ label, path }) => (
        <Link key={path} to={workspace.link(path)} data-nine-core-transition={path === "/app/acompanhamento" ? "student" : "module"} aria-current={pathname === path ? "page" : undefined}>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
