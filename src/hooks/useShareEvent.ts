import { useCallback, useState } from "react";
import { recordShareEvent } from '@/services/share.service';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ShareContentType =
  | "workout_completed"
  | "first_workout"
  | "id_card"
  | "id_card_upgrade"
  | "goal_achieved"
  | "level_up"
  | "streak_7"
  | "personal_record"
  | "assessment_completed"
  | "quick_workout_completed"
  | "sync_score"
  | "weekly_recap";

/**
 * Motor de Viralização (Bloco F).
 * Captura um nó DOM via html2canvas, dispara navigator.share (com fallback de download)
 * e registra o evento em share_events para analytics.
 */
export function useShareEvent(contentType: ShareContentType) {
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (node: HTMLElement, opts?: { label?: string; contentId?: string | null }) => {
      const label = opts?.label;
      const contentId = opts?.contentId;
      let channel: "native" | "download" = "download";

      setSharing(true);
      try {
        const { default: html2canvas } = await import("html2canvas");
        await document.fonts.ready;
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
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
          channel = "native";
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
          toast.success("Imagem salva! Compartilhe nas suas redes.");
        }

        // Registrar evento (não bloqueia caso falhe)
        try {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const receipt = await recordShareEvent({ userId: user.id, contentType, contentId, channel });
            if (receipt.rewarded) {
              toast.success(`+${receipt.reward_xp} XP registrados`);
              window.dispatchEvent(new Event('9fit:sync_updated'));
            }
          }
        } catch (e) { console.warn("[share_events] insert:", e); }
        return channel;
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("[useShareEvent]", e);
          toast.error("Não foi possível compartilhar agora.");
        }
        return null;
      } finally {
        setSharing(false);
      }
    },
    [contentType]
  );

  return { share, sharing };
}
