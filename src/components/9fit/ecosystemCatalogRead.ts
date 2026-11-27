export type ModuleLink = "native" | "configured" | "not_configured";

export interface ConfirmedCatalog<T> {
  scope: string;
  items: T[];
  statusByKey: Record<string, ModuleLink>;
  iframeByKey: Record<string, string | null>;
}

export interface CatalogRead<T> {
  items: T[];
  statusByKey: Record<string, ModuleLink>;
  iframeByKey: Record<string, string | null>;
  confirmed: ConfirmedCatalog<T> | null;
  stale: boolean;
  unread: boolean;
}

const PARTNERS = new Set(["staff", "store", "foods", "events"]);

/** Catálogo já confirmado não vira "desligado" se a consulta seguinte falhar. */
export function catalogAfterRead<T>(
  previous: ConfirmedCatalog<T> | null,
  scope: string,
  failed: boolean,
  items: T[],
  statusByKey: Record<string, ModuleLink>,
  iframeByKey: Record<string, string | null>,
): CatalogRead<T> {
  if (!failed) {
    return {
      items,
      statusByKey,
      iframeByKey,
      confirmed: { scope, items, statusByKey, iframeByKey },
      stale: false,
      unread: false,
    };
  }
  if (previous?.scope === scope) {
    return {
      items: previous.items,
      statusByKey: previous.statusByKey,
      iframeByKey: previous.iframeByKey,
      confirmed: previous,
      stale: true,
      unread: false,
    };
  }
  return {
    items,
    statusByKey: {},
    iframeByKey: {},
    confirmed: null,
    stale: false,
    unread: true,
  };
}

export function hologramStatusCopy(
  key: string,
  status: ModuleLink | undefined,
  unread: boolean,
): string {
  if (unread || !status) return "Leitura do módulo não confirmada";
  if (PARTNERS.has(key)) return "Abre o serviço parceiro";
  if (status === "native") return "Disponível no app";
  if (status === "configured") return "Serviço externo";
  return "Integração não confirmada";
}

export function cardStatusCopy(
  key: string,
  status: ModuleLink | undefined,
  unread: boolean,
): string {
  if (unread || !status) return "Leitura do módulo não confirmada";
  if (PARTNERS.has(key)) return "Serviço externo";
  if (status === "native") return "Tela no app";
  if (status === "configured") return "Destino configurado · disponibilidade externa não verificada";
  return "Integração não configurada";
}

export function configuredCountLabel(active: number, total: number, unread: boolean): string {
  if (unread) return "CATÁLOGO AINDA NÃO CONFIRMADO";
  return `${active} DE ${total} DESTINOS CONFIGURADOS`;
}
