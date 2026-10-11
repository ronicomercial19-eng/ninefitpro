import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyContext } from '@/hooks/useDailyContext';
import { businessDate, selectDayCommand } from '@/services/dailyContextRules';

export interface ProactiveTip { id: string; text: string; cta?: string }
export function useProactiveRon() {
  const { user } = useAuth();
  const context = useDailyContext();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const day = businessDate();
  const current = context.data?.date === day ? context.data : null;
  const command = current && !context.isError ? selectDayCommand(current) : null;
  const id = `${user?.id}:${day}:${command?.key}`;
  const tip: ProactiveTip | null = command && command.key !== 'complete' && !dismissed.includes(id) ? { id, text: command.description, cta: command.label } : null;
  const dismiss = (key: string) => setDismissed(previous => [...previous.slice(-20), key]);
  return { tip, dismiss };
}
