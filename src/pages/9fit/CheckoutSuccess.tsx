import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown } from "lucide-react";

export default function NineFitCheckoutSuccess() {
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/15 grid place-items-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-display italic">Acesso liberado!</h1>
        <p className="text-muted-foreground">Sua assinatura foi ativada e os módulos premium já estão disponíveis.</p>
        <div className="flex flex-col gap-2">
          <Button asChild size="lg"><Link to="/9fit/prime"><Crown className="w-4 h-4 mr-2" /> Ir para Prime</Link></Button>
          <Button asChild variant="ghost"><Link to="/9fit/os">Voltar ao OS</Link></Button>
        </div>
        {offerId && <p className="text-[10px] font-mono text-muted-foreground">ref: {offerId}</p>}
      </div>
    </div>
  );
}
