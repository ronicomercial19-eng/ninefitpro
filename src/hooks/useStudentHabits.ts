import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { businessDate } from '@/services/dailyContextRules';
import { consecutiveDays } from '@/lib/studentDates';
import { toast } from 'sonner';

export interface StudentHabit { id: string; title: string; streak: number; today_done: boolean; target_per_week: number }
export function useStudentHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<StudentHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const writing = useRef(false);
  const owner = useRef(user?.id); owner.current = user?.id;
  const load = useCallback(async () => {
    const request = ++revision.current;
    if (!user) { setHabits([]); setLoading(false); return; }
    setLoading(true); setError(false);
    try {
      const { data, error: readError } = await (supabase as any).from('student_habits').select('id,title,target_per_week,student_habit_days(habit_date)').eq('user_id', user.id).order('created_at');
      if (readError) throw readError;
      const today = businessDate();
      if (request === revision.current) setHabits((data || []).map((h: any) => {
        const dates = (h.student_habit_days || []).map((d: any) => d.habit_date);
        return { ...h, today_done: dates.includes(today), streak: consecutiveDays(dates, today) };
      }));
    } catch { if (request === revision.current) { setError(true); setHabits([]); } }
    finally { if (request === revision.current) setLoading(false); }
  }, [user?.id]);
  useEffect(() => {
    setHabits([]); void load();
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    // Refresh once at the São Paulo date boundary, including an open foreground tab.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = Date.now(), date = businessDate(); let low = now, high = now + 86400000;
      while (high - low > 1000) { const mid = Math.floor((low + high) / 2); if (businessDate(new Date(mid)) === date) low = mid; else high = mid; }
      timer = setTimeout(() => { refresh(); schedule(); }, high - now + 1000);
    };
    schedule();
    return () => { revision.current++; clearTimeout(timer); window.removeEventListener('focus', refresh); };
  }, [load]);
  const mutate = async (operation: (uid: string) => PromiseLike<{ error: any }>) => {
    if (!user || writing.current) return false;
    const uid = user.id; writing.current = true; setBusy(true);
    try {
      const result = await operation(uid); if (result.error) throw result.error;
      if (owner.current === uid) { await load(); window.dispatchEvent(new Event('9fit:habit-updated')); return true; }
    } catch { if (owner.current === uid) toast.error('Não foi possível salvar o hábito. Tente novamente.'); }
    finally { writing.current = false; setBusy(false); }
    return false;
  };
  const toggle = (id: string) => {
    const habit = habits.find(h => h.id === id); if (!habit) return;
    return mutate(uid => habit.today_done
      ? (supabase as any).from('student_habit_days').delete().eq('habit_id', id).eq('user_id', uid).eq('habit_date', businessDate())
      : (supabase as any).from('student_habit_days').upsert({ habit_id: id, user_id: uid, habit_date: businessDate() }, { onConflict: 'habit_id,habit_date', ignoreDuplicates: true }));
  };
  const add = (title: string) => mutate(uid => (supabase as any).from('student_habits').insert({ user_id: uid, title: title.trim(), target_per_week: 5 }));
  const remove = (id: string) => mutate(uid => (supabase as any).from('student_habits').delete().eq('id', id).eq('user_id', uid));
  const importLegacy = async () => {
    if (!user) return;
    try {
      const legacy = JSON.parse(localStorage.getItem(`9fit.habits.${user.id}`) || '[]');
      const rows = Array.isArray(legacy) ? legacy.filter(h => typeof h.title === 'string' && h.title.trim()).map(h => ({user_id:user.id,title:h.title.trim().slice(0,120),target_per_week:Math.max(1,Math.min(7,Number(h.target_per_week)||5))})) : [];
      if (!rows.length) { toast.info('Nenhum hábito antigo desta conta foi encontrado neste navegador.'); return; }
      const unique = [...new Map(rows.map(h => [h.title,h])).values()];
      if (await mutate(() => (supabase as any).from('student_habits').upsert(unique,{onConflict:'user_id,title',ignoreDuplicates:true}))) toast.success('Hábitos recuperados. Marcações antigas sem data não foram transformadas em conclusões.');
    } catch { toast.error('Não foi possível recuperar os hábitos deste navegador.'); }
  };
  return { habits, loading, busy, error, reload: load, toggle, add, remove, importLegacy };
}
