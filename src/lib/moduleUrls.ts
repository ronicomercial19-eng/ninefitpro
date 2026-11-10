import { COMMUNITY_URL } from "./communityUrl";

/** Destinos oficiais dos módulos externos. Nunca anexe tokens nem credenciais. */
export const EVENTS_URL = "https://eventosnine.lovable.app";
export const ACADEMY_URL = "https://ninetyfit-academy-forge.lovable.app";
export { COMMUNITY_URL };

export type ExternalModuleKey = "events" | "academy";

export const EXTERNAL_MODULES: Record<ExternalModuleKey, { title: string; label: string; description: string; url: string }> = {
  events: { title: "Eventos Nine", label: "EVENTOS · NINE", description: "Agenda de eventos, desafios e encontros da Nine.", url: EVENTS_URL },
  academy: { title: "Academy Nine", label: "ACADEMY · NINE", description: "Cursos e formações da Nine.", url: ACADEMY_URL },
};
