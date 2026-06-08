import { EcoEmbed } from "@/components/9fit/EcoEmbed";
export default function Kitchen() {
  const url = (import.meta as any).env?.VITE_KITCHEN_EMBED_URL || "https://9foods.lovable.app";
  return <EcoEmbed title="9KITCHEN — 9Foods" url={url} />;
}
