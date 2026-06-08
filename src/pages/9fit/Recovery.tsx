import { EcoEmbed } from "@/components/9fit/EcoEmbed";
export default function Recovery() {
  const url = (import.meta as any).env?.VITE_RECOVERY_EMBED_URL || "https://9recovery.lovable.app";
  return <EcoEmbed title="9RECOVERY" url={url} />;
}
