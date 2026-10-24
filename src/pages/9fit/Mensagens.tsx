import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfessionalMessages } from "@/components/students/ProfessionalMessages";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
export default function NineFitMensagens() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["student-professional", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "fn_student_professional" as any,
      );
      if (error) throw error;
      return data as unknown as {
        athlete_id: string;
        coach_name: string | null;
        available: boolean;
      };
    },
  });
  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-5 p-5 pt-16 pb-28">
      <h1 className="text-2xl font-display">Mensagens</h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link to="/9fit/acompanhamento" className="text-primary underline">
          Solicitações e devolutivas
        </Link>
        <Link to="/9fit/ron" className="text-primary underline">
          Falar com RON · IA
        </Link>
        <Link to="/9fit/ron?tab=equipe" className="text-primary underline">
          Atendimento da equipe
        </Link>
      </div>
      {q.isLoading ? (
        <p>Carregando seu vínculo…</p>
      ) : q.isError ? (
        <p role="alert">
          Não foi possível confirmar seu profissional.{" "}
          <button onClick={() => void q.refetch()} className="underline">
            Tentar novamente
          </button>
        </p>
      ) : q.data?.available ? (
        <ProfessionalMessages
          key={q.data.athlete_id}
          athleteId={q.data.athlete_id}
          name={q.data.coach_name ?? undefined}
        />
      ) : (
        <p>
          Não há profissional vinculado disponível. Fale com a equipe para
          conferir seu acompanhamento.
        </p>
      )}
      <BottomNavigation />
    </div>
  );
}
