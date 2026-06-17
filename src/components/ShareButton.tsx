import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  contentType: "workout" | "progress" | "achievement" | "store" | "plan" | "diet" | "calories";
  contentId?: string;
  title?: string;
  text?: string;
  url?: string;
  rewardXp?: number;
  className?: string;
  label?: string;
}

/**
 * Botão de compartilhamento com Web Share API + fallback clipboard.
 * Registra evento em share_events e premia XP ao usuário (loop de virilização).
 */
export function ShareButton({
  contentType, contentId, title = "9FIT PRO",
  text = "Confira meu progresso no 9FIT PRO!",
  url, rewardXp = 25, className = "", label = "Compartilhar",
}: Props) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const shareUrl = url || window.location.href;
    let channel: "whatsapp" | "copy" | "native" | "instagram" = "copy";

    // Bloco 6 — busca template visual por content_type
    let templateSlug: string | null = null;
    let templateAccent: string | null = null;
    try {
      const { data: tpl } = await supabase
        .from("social_share_templates" as any)
        .select("slug, accent_color, name")
        .eq("active", true)
        .eq("content_type", contentType)
        .limit(1)
        .maybeSingle();
      if (tpl) {
        templateSlug = (tpl as any).slug;
        templateAccent = (tpl as any).accent_color;
      }
    } catch { /* templates são opcionais */ }

    try {
      const enrichedText = templateAccent
        ? `🔥 ${text}`
        : text;
      if (navigator.share) {
        await navigator.share({ title, text: enrichedText, url: shareUrl });
        channel = "native";
      } else {
        await navigator.clipboard.writeText(`${enrichedText} ${shareUrl}`);
        channel = "copy";
        toast.success("Link copiado!");
      }
      setDone(true);
      setTimeout(() => setDone(false), 2500);

      if (user) {
        await supabase.from("share_events" as any).insert({
          user_id: user.id, channel, content_type: contentType,
          content_id: contentId ?? null, reward_xp: rewardXp,
        });
        const { data: a } = await supabase.from("athletes")
          .select("id").eq("user_id", user.id).maybeSingle();
        if (a?.id) {
          await supabase.rpc("fn_award_xp" as any, {
            p_athlete_id: (a as any).id,
            p_amount: rewardXp,
            p_source: `share:${channel}:${contentType}${templateSlug ? `:${templateSlug}` : ""}`,
            p_metadata: { content_id: contentId ?? null, template: templateSlug },
          });
          toast.success(`+${rewardXp} XP por compartilhar!`);
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Não foi possível compartilhar");
    } finally {
      setSharing(false);
    }
  };

  return (
    <button onClick={handleShare} disabled={sharing}
      className={`inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50 ${className}`}>
      {done ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {done ? "Compartilhado!" : label}
    </button>
  );
}
