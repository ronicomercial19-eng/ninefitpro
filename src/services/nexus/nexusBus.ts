/**
 * Nexus Bus — barramento único de sincronização tempo-real.
 * Professor publica → Supabase grava → Nexus dispara → Aluno reflete.
 */
import { supabase } from "@/integrations/supabase/client";

type Topic = "skills" | "skill_activations" | "monetization_offers" | "api_connectors" | "biohacker_protocols" | "physio_modules";

const channels = new Map<string, ReturnType<typeof supabase.channel>>();

export function subscribeNexus(
  topic: Topic,
  onChange: (payload: { eventType: string; new: any; old: any }) => void,
) {
  const key = `nexus:${topic}`;
  let ch = channels.get(key);
  if (!ch) {
    ch = supabase
      .channel(key)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: topic },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent(`9fit:nexus:${topic}`, { detail: payload }));
          onChange({ eventType: payload.eventType, new: payload.new, old: payload.old });
        },
      )
      .subscribe();
    channels.set(key, ch);
  } else {
    const handler = (e: Event) => {
      const p: any = (e as CustomEvent).detail;
      onChange({ eventType: p.eventType, new: p.new, old: p.old });
    };
    window.addEventListener(`9fit:nexus:${topic}`, handler);
    return () => window.removeEventListener(`9fit:nexus:${topic}`, handler);
  }
  return () => {
    /* keep channel alive across listeners */
  };
}

export function emitNexus(event: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}
