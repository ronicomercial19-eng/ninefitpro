import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function StudentRealtimeSync() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || profile?.role !== 'student') return;

    // Subscribe to changes in the student's data
    const studentSubscription = supabase
      .channel(`student_sync_${user.id}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'students',
          filter: `email=eq.${user.email}`
        },
        (payload) => {
          console.log('Student data updated:', payload);
          
          switch (payload.eventType) {
            case 'UPDATE':
              toast.success('Seus dados foram atualizados pelo seu treinador!', {
                description: 'Verifique suas informações atualizadas.'
              });
              break;
            case 'INSERT':
              toast.success('Bem-vindo! Seu perfil foi criado.', {
                description: 'Agora você pode acessar todos os recursos.'
              });
              break;
          }
          
          // Force a page refresh to get updated data
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      )
      .subscribe();

    // Subscribe to workout assignments
    const workoutSubscription = supabase
      .channel(`workouts_sync_${user.id}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'workouts',
          filter: `student_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Workout updated:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              toast.success('Novo treino disponível!', {
                description: 'Confira seu novo plano de treino.'
              });
              break;
            case 'UPDATE':
              toast.info('Treino atualizado!', {
                description: 'Seu treino foi modificado pelo seu treinador.'
              });
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(studentSubscription);
      supabase.removeChannel(workoutSubscription);
    };
  }, [user, profile]);

  return null; // This component doesn't render anything
}