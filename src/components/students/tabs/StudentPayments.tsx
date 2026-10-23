import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { confirmedAccess } from "@/lib/customerEntry";
import { Button } from "@/components/ui/button";
export function StudentPayments({
  student,
}: {
  student: { id: string; nome: string };
  onStudentUpdate: (value: any) => void;
}) {
  const { user, isAdmin } = useAuth();
  const q = useQuery({
    queryKey: ["coach-subscription", user?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "fn_coach_subscription_context" as any,
        { p_athlete_id: student.id },
      );
      if (error) throw error;
      return data as unknown as {
        linked: boolean;
        subscription: { status: string; expires_at: string | null } | null;
      };
    },
  });
  return (
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="text-xl font-semibold">
        Assinatura e acesso · {student.nome}
      </h2>
      {q.isLoading ? (
        <p>Consultando assinatura registrada…</p>
      ) : q.isError ? (
        <p role="alert">
          Não foi possível verificar o acesso.{" "}
          <Button variant="outline" onClick={() => void q.refetch()}>
            Tentar novamente
          </Button>
        </p>
      ) : !q.data?.linked ? (
        <p>Conta de acesso ainda não vinculada a este cadastro.</p>
      ) : !q.data.subscription ? (
        <p>Nenhuma assinatura registrada para a conta vinculada.</p>
      ) : (
        <>
          <p>
            {confirmedAccess(q.data.subscription)
              ? "Assinatura válida registrada"
              : "Sem assinatura válida confirmada"}
          </p>
          <p className="text-sm text-muted-foreground">
            Validade:{" "}
            {q.data.subscription.expires_at
              ? new Date(q.data.subscription.expires_at).toLocaleDateString(
                  "pt-BR",
                  { timeZone: "America/Sao_Paulo" },
                )
              : "sem vencimento registrado"}
          </p>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Cadastro, prescrição e crédito de aula não ativam assinatura. O
        acompanhamento profissional não altera pagamentos nem confirma
        recebimento financeiro.
      </p>
      {isAdmin && (
        <Link className="text-primary underline" to="/app/alunos-assinaturas">
          Abrir gestão administrativa de assinaturas
        </Link>
      )}
    </section>
  );
}
