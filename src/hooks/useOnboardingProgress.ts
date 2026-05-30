import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep =
  | "welcome" | "profile" | "goals" | "assessment"
  | "calibration" | "protocols" | "prime" | "done";

export const ORDER: OnboardingStep[] = [
  "welcome","profile","goals","assessment","calibration","protocols","prime","done",
];

export function useOnboardingProgress() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [completed, setCompleted] = useState<OnboardingStep[]>([]);
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: row } = await supabase
      .from("onboarding_progress").select("*").eq("user_id", user.id).maybeSingle();
    if (row) {
      setStep((row.current_step as OnboardingStep) ?? "welcome");
      setCompleted((row.completed_steps as OnboardingStep[]) ?? []);
      setData(row.data ?? {});
    }
    setLoading(false);
  }

  async function advance(next: OnboardingStep, payload?: Record<string, any>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newCompleted = Array.from(new Set([...completed, step]));
    const newData = { ...data, ...(payload ?? {}) };
    await supabase.from("onboarding_progress").upsert({
      user_id: user.id,
      current_step: next,
      completed_steps: newCompleted,
      data: newData,
    });
    setStep(next); setCompleted(newCompleted); setData(newData);
  }

  return { step, completed, data, loading, advance };
}
