import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuccessMetrics {
  // Métricas de engajamento
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  
  // Métricas de performance
  completionRate: number;
  dropoffRate: number;
  retentionRate: number;
  
  // Métricas de crescimento
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  growthRate: number;
  
  // Métricas de satisfação
  averageRating: number;
  npsScore: number;
  supportResponseTime: number;
}

export function useSuccessMetrics() {
  const [metrics, setMetrics] = useState<SuccessMetrics>({
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    averageSessionDuration: 0,
    completionRate: 0,
    dropoffRate: 0,
    retentionRate: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    growthRate: 0,
    averageRating: 0,
    npsScore: 0,
    supportResponseTime: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch students data
      const { data: students } = await supabase
        .from('students')
        .select('id, created_at, ativo');
      
      // Fetch workouts data
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, status, created_at');
      
      // Calculate metrics
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const activeStudents = students?.filter(s => s.ativo) || [];
      const newUsersThisWeek = students?.filter(s => 
        new Date(s.created_at) >= oneWeekAgo
      ).length || 0;
      const newUsersThisMonth = students?.filter(s => 
        new Date(s.created_at) >= oneMonthAgo
      ).length || 0;
      
      const completedWorkouts = workouts?.filter(w => w.status === 'completed').length || 0;
      const totalWorkouts = workouts?.length || 1;
      
      setMetrics({
        dailyActiveUsers: activeStudents.length,
        weeklyActiveUsers: activeStudents.length,
        monthlyActiveUsers: students?.length || 0,
        averageSessionDuration: 45, // Mock data - em minutos
        completionRate: (completedWorkouts / totalWorkouts) * 100,
        dropoffRate: ((totalWorkouts - completedWorkouts) / totalWorkouts) * 100,
        retentionRate: 87, // Mock data
        newUsersThisWeek,
        newUsersThisMonth,
        growthRate: newUsersThisMonth > 0 ? ((newUsersThisWeek / newUsersThisMonth) * 100) : 0,
        averageRating: 4.7, // Mock data
        npsScore: 72, // Mock data
        supportResponseTime: 2.5 // Mock data - em horas
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = async (eventName: string, metadata?: Record<string, any>) => {
    try {
      // Log do evento para análise futura
      console.log('Event tracked:', eventName, metadata);
      
      // Aqui você pode implementar integração com analytics
      // como Google Analytics, Mixpanel, etc.
      
      // Exemplo: criar tabela de eventos no Supabase
      /* await supabase
        .from('analytics_events')
        .insert({
          event_name: eventName,
          metadata: metadata,
          timestamp: new Date().toISOString()
        }); */
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const refreshMetrics = () => {
    fetchMetrics();
  };

  return {
    metrics,
    loading,
    trackEvent,
    refreshMetrics
  };
}
