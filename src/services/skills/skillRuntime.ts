/**
 * Skill Runtime — carrega skills ativas, monta contexto enxuto e injeta no prompt.
 * Cache em memória (1h). Loga eventos em skill_events.
 */
import { supabase } from "@/integrations/supabase/client";

export type ActiveSkill = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  content: any;
  version: number;
};

export type SkillContext = {
  userId: string;
  athleteId?: string;
  profile?: { level?: number; objective?: string; experience?: string };
  bio?: { hrv?: number | null; sleep?: number | null; recovery?: number | null };
  activeSkills: ActiveSkill[];
  moduleContext?: string;
  timestamp: string;
};

const CACHE_TTL = 60 * 60 * 1000; // 1h
const skillCache = new Map<string, { prompt: string; t: number }>();

export async function loadActiveSkillsFor(_userId: string): Promise<ActiveSkill[]> {
  const { data } = await supabase
    .from("skills")
    .select("id, slug, name, category, description, content, version")
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  return (data ?? []) as ActiveSkill[];
}

export async function buildSkillContext(userId: string, moduleContext = "general"): Promise<SkillContext> {
  const [{ data: athleteRaw }, skills] = await Promise.all([
    supabase.from("athletes").select("id, level, experience_level").eq("user_id", userId).maybeSingle(),
    loadActiveSkillsFor(userId),
  ]);
  const athlete = athleteRaw as any;

  let bio: SkillContext["bio"] = {};
  if (athlete?.id) {
    const [{ data: hrv }, { data: sleep }, { data: rec }] = await Promise.all([
      supabase.from("bio_hrv_logs" as any).select("hrv_ms").eq("athlete_id", athlete.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bio_sleep_logs" as any).select("duration_min").eq("athlete_id", athlete.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bio_recovery_state" as any).select("score").eq("athlete_id", athlete.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    bio = { hrv: (hrv as any)?.hrv_ms ?? null, sleep: (sleep as any)?.duration_min ?? null, recovery: (rec as any)?.score ?? null };
  }

  return {
    userId,
    athleteId: athlete?.id,
    profile: athlete ? { level: athlete.level, experience: athlete.experience_level } : undefined,
    bio,
    activeSkills: skills,
    moduleContext,
    timestamp: new Date().toISOString(),
  };
}

function compileSkills(skills: ActiveSkill[]): string {
  if (!skills.length) return "";
  const parts = skills.map((s) => {
    const body = typeof s.content === "string" ? s.content : JSON.stringify(s.content, null, 0);
    return `### SKILL ${s.slug} (${s.category}) v${s.version}\n${s.description ?? ""}\n${body}`;
  });
  return `\n\n## SKILLS ATIVAS (Nexus)\n${parts.join("\n\n")}\n`;
}

function cacheKey(ctx: SkillContext) {
  return `${ctx.userId}:${ctx.moduleContext}:${ctx.activeSkills.map((s) => `${s.slug}@${s.version}`).join(",")}`;
}

export function injectSkillsIntoPrompt(ctx: SkillContext, basePrompt: string): { enriched: string; cacheHit: boolean; applied: string[] } {
  const key = cacheKey(ctx);
  const cached = skillCache.get(key);
  if (cached && Date.now() - cached.t < CACHE_TTL) {
    return { enriched: `${cached.prompt}\n\n${basePrompt}`, cacheHit: true, applied: ctx.activeSkills.map((s) => s.slug) };
  }
  const header = compileSkills(ctx.activeSkills);
  const bioLine = ctx.bio
    ? `\n## ESTADO FISIO ATUAL\nHRV:${ctx.bio.hrv ?? "—"} | Sono(min):${ctx.bio.sleep ?? "—"} | Recovery:${ctx.bio.recovery ?? "—"}\n`
    : "";
  const prompt = `${header}${bioLine}`;
  skillCache.set(key, { prompt, t: Date.now() });
  void logApplied(ctx);
  return { enriched: `${prompt}\n\n${basePrompt}`, cacheHit: false, applied: ctx.activeSkills.map((s) => s.slug) };
}

async function logApplied(ctx: SkillContext) {
  if (!ctx.activeSkills.length) return;
  try {
    await supabase.from("skill_events").insert(
      ctx.activeSkills.map((s) => ({
        skill_id: s.id,
        user_id: ctx.userId,
        event_type: "applied",
        payload: { module: ctx.moduleContext, ts: ctx.timestamp },
      })) as any
    );
  } catch {
    /* fail silent */
  }
}
