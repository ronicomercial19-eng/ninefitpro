import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { PDIWizard } from '@/components/9fit/PDIWizard';
import { Button } from '@/components/ui/button';
import { useDailyContext } from '@/hooks/useDailyContext';

export default function NineFitAtivacao() {
  const navigate = useNavigate();
  const context = useDailyContext();
  const [profileOpen, setProfileOpen] = useState(true);
  useEffect(() => {
    if (context.data?.profile.complete) navigate('/9fit/os', { replace: true });
  }, [context.data?.profile.complete, navigate]);

  if (context.isPending) return <div className="min-h-screen grid place-items-center" role="status">Carregando sua ficha…</div>;
  if (context.isError) return <div className="min-h-screen grid place-items-center p-6"><section className="text-center space-y-4"><p>Não consegui ler sua ficha. Seus dados anteriores foram preservados.</p><Button onClick={() => void context.refetch()}>Tentar novamente</Button></section></div>;
  if (context.data?.profile.complete) return <div className="p-6 text-center" role="status">Abrindo sua jornada diária…</div>;
  return <div className="min-h-screen bg-background p-6 flex items-center justify-center"><section className="max-w-md space-y-4 text-center">
    <Rocket className="mx-auto text-primary h-10 w-10" />
    <h1 className="text-2xl font-display">Vamos completar sua ficha</h1>
    <p className="text-sm text-muted-foreground">Confirme nove informações sobre seus objetivos, recuperação, rotina e restrições. Cada resposta é salva na sua conta para você continuar depois.</p>
    <Button onClick={() => setProfileOpen(true)}>Continuar minha ficha</Button>
    <PDIWizard open={profileOpen} onClose={() => setProfileOpen(false)} onComplete={() => { void context.refetch(); }} />
  </section></div>;
}
