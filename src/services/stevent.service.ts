const STEVENT_API_URL = "https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/staff-api";
const STEVENT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZXh5c3F0ZnNvZmRvaHVqdGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwOTcwODEsImV4cCI6MjA2NzY3MzA4MX0.sHkR14oVnSZ4Rr1h3cXIBxETP7-SIg0XALf5bNC1_jA";

export interface SteventMethod {
  id: string;
  name: string;
  category: string;
  goals: string[];
  level: string;
  format: string;
}

export interface SteventHub {
  id: string;
  name: string;
  density: string;
}

export interface SteventProfessional {
  id: string;
  name: string;
  role: string;
  skills: string[];
  location: string;
  availability: string[];
  hourly: string | number | null;
  bio: string | null;
  portfolio: string | null;
  transport: string | null;
  contact: { whatsapp?: string; email?: string };
  match_score?: number;
}

async function call(action: string, init?: RequestInit) {
  const res = await fetch(`${STEVENT_API_URL}/${action}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: STEVENT_ANON_KEY,
      Authorization: `Bearer ${STEVENT_ANON_KEY}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Stevent API ${action} falhou (${res.status})`);
  }
  return res.json();
}

export const steventApi = {
  getMethods: () => call("methods").then((r) => r.methods as SteventMethod[]),

  getHubs: () => call("hubs").then((r) => r.hubs as SteventHub[]),

  getProfessionals: (params?: { method?: string; hub?: string }) => {
    const qs = new URLSearchParams();
    if (params?.method) qs.set("method", params.method);
    if (params?.hub) qs.set("hub", params.hub);
    const q = qs.toString();
    return call(`professionals${q ? `?${q}` : ""}`).then((r) => r.professionals as SteventProfessional[]);
  },

  match: (body: { method: string; hub?: string; preferences?: any; limit?: number }) =>
    call("match", { method: "POST", body: JSON.stringify(body) }).then((r) => r.matches as SteventProfessional[]),

  book: (body: {
    freelancer_id: string;
    method: string;
    slot?: string;
    client_id?: string;
    client_name?: string;
    hub?: string;
    notes?: string;
  }) => call("booking", { method: "POST", body: JSON.stringify(body) }),
};
