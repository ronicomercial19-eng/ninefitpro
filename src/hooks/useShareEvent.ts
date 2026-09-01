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
  | "streak_7"
  | "personal_record"
  | "assessment_completed"
  | "quick_workout_completed"
  | "sync_score"
  | "weekly_recap";

export type ShareChannel = "native" | "download";

const SHARE_XP_BONUS = 15;

/**
 * Renderiza um nó DOM em PNG (html2canvas) — usado pelos cards de conquista.
 */
export async function renderNodeToPng(node: HTMLElement, scale = 2): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, {
    backgroundColor: "#090909",
    scale,
    useCORS: true,
    logging: false,
  });
  const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png", 0.95));
  if (!blob) throw new Error("Falha ao gerar imagem");
  return blob;
}

/**
 * Compartilha um PNG via Web Share API (mobile) com fallback para download (desktop).
 * Retorna o canal usado, ou null se o usuário cancelou.
 */
export async function shareOrDownloadPng(blob: Blob, fileName: string, label: string): Promise<ShareChannel | null> {
  const file = new File([blob], fileName, { type: "image/png" });
  const navAny = navigator as any;
  if (navAny.share && navAny.canShare?.({ files: [file] })) {
    try {
      await navAny.share({ files: [file], title: label, text: label });
      return "native";
    } catch (e: any) {
      if (e?.name === "AbortError") return null;
      throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
  toast.success("Imagem salva! Compartilhe nas suas redes.");
  return "download";
}

/** Registra o evento em share_events (nunca bloqueia o fluxo). */
export async function logShareEvent(params: {
  athleteId: string | null;
  contentType: ShareContentType;
  channel: ShareChannel;
  contentId?: string | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("share_events" as any).insert({
      athlete_id: params.athleteId,
      user_id: user?.id,
      content_type: params.contentType,
      content_id: params.contentId ?? null,
      channel: params.channel,
      shared_at: new Date().toISOString(),
      reward_xp: SHARE_XP_BONUS,
    } as any);
  } catch (e) { console.warn("[share_events] insert:", e); }
}

/**
 * Credita o bônus de XP por compartilhar via fn_reward_share (idempotente no banco —
 * nunca duplica recompensa pro mesmo athlete_id + content_type + content_id).
 * Nunca lança erro pro chamador: falha aqui não pode travar o fluxo de compartilhamento.
 */
export async function rewardShare(params: {
  athleteId: string | null;
  contentType: ShareContentType;
  contentId?: string | null;
}): Promise<{ awarded: boolean; newTotalXp?: number } | null> {
  if (!params.athleteId) return null;
  try {
    const { data, error } = await supabase.rpc("fn_reward_share" as any, {
      p_athlete_id: params.athleteId,
      p_content_type: params.contentType,
      p_content_id: params.contentId ?? null,
      p_amount: SHARE_XP_BONUS,
    } as any);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.awarded) {
      toast.success(`+${SHARE_XP_BONUS} XP por compartilhar! 🔥`);
      return { awarded: true, newTotalXp: row.new_total_xp };
    }
    return { awarded: false };
  } catch (e) {
    console.warn("[fn_reward_share]", e);
    return null;
  }
}

/**
 * Motor de Viralização (Bloco F).
 * Captura um nó DOM via html2canvas, dispara navigator.share (com fallback de download),
 * registra o evento em share_events e credita o bônus de XP (idempotente).
 */
export function useShareEvent(contentType: ShareContentType) {
  const { athleteId } = useAthleteId();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (node: HTMLElement | null, label?: string, contentId?: string | null) => {
      if (!node) return;
      setSharing(true);
      try {
        const blob = await renderNodeToPng(node);
        const channel = await shareOrDownloadPng(
          blob,
          `9fit-${contentType}-${Date.now()}.png`,
          label || "Mais uma conquista no 9FIT",
        );
        if (channel) {
          await logShareEvent({ athleteId, contentType, channel, contentId });
          await rewardShare({ athleteId, contentType, contentId });
        }
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
    [athleteId, contentType]
  );

  return { share, sharing };
}
