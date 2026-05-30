import { useEffect } from "react";
import { subscribeNexus } from "./nexusBus";

type Topic = "skills" | "skill_activations" | "monetization_offers" | "api_connectors" | "biohacker_protocols" | "physio_modules";

export function useNexus(topic: Topic, onChange: (payload: any) => void) {
  useEffect(() => {
    const off = subscribeNexus(topic, onChange);
    return () => { if (typeof off === "function") off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
}
