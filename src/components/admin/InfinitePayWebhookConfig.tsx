import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

export function InfinitePayWebhookConfig() {
  const { toast } = useToast();
  // Using the domain from the current window location for accuracy
  const webhookUrl = `${window.location.origin}/api/webhook/infinitepay`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para sua área de transferência.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Webhook (InfinitePay)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copie a URL abaixo e cole no campo de configuração de webhook do painel da InfinitePay para receber notificações de pagamento.
        </p>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md break-all">
          <code className="text-sm font-mono flex-1">{webhookUrl}</code>
          <Button variant="ghost" size="icon" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
