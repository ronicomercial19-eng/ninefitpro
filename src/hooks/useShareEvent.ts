import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "./useAthleteId";
import { toast } from "sonner";

export type ShareContentType =
  | "workout_completed"
  | "first_workout"
  | "id_card_upgrade"
  | "goal_achieved"
  | "level_up"
  | "streak_7";

/**
 * Motor de Viralização (Bloco F).
 * Captura um nó DOM via html2canvas, dispara navigator.share (com fallback de download)
 * e registra o evento em share_events para analytics.
 */
export function useShareEvent(contentType: ShareContentType) {
  const { athleteId } = useAthleteId();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (node: HTMLElement | null, label?: string) => {
      if (!node) return;
      setSharing(true);
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(node, {
          backgroundColor: "#090909",
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png", 0.95));
        if (!blob) throw new Error("Falha ao gerar imagem");
        const file = new File([blob], `9fit-${contentType}-${Date.now()}.png`, { type: "image/png" });

        const navAny = navigator as any;
        if (navAny.share && navAny.canShare?.({ files: [file] })) {
          await navAny.share({
            files: [file],
            title: label || "9FIT",
            text: label || "Mais uma conquista no 9FIT",
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
          toast.success("Imagem salva! Compartilhe nas suas redes.");
        }

        // Registrar evento (não bloqueia caso falhe)
        try {
          await supabase.from("share_events" as any).insert({
            athlete_id: athleteId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            content_type: contentType,
            channel: navAny.share ? "native" : "download",
            shared_at: new Date().toISOString(),
          } as any);
        } catch (e) { console.warn("[share_events] insert:", e); }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("[useShareEvent]", e);
          toast.error("Não foi possível compartilhar agora.");
        }
      } finally {
        setSharing(false);
      }
    },
    [athleteId, contentType]
  );

  return { share, sharing };
}
