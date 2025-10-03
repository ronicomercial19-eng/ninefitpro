import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const LGPDConsent = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkConsent();
    }
  }, [user]);

  const checkConsent = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .eq('consent_type', 'terms_of_service')
      .single();

    if (error || !data) {
      setOpen(true);
    }
  };

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      toast({
        title: 'Consentimento obrigatório',
        description: 'Você precisa aceitar os termos de uso e política de privacidade.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const consents = [
        {
          user_id: user?.id,
          consent_type: 'terms_of_service',
          consent_given: true,
          consent_text: 'Termos de Uso 9FIT v1.0',
        },
        {
          user_id: user?.id,
          consent_type: 'privacy_policy',
          consent_given: true,
          consent_text: 'Política de Privacidade 9FIT v1.0',
        },
        {
          user_id: user?.id,
          consent_type: 'marketing',
          consent_given: acceptedMarketing,
          consent_text: 'Comunicações de Marketing 9FIT',
        },
      ];

      const { error } = await supabase.from('user_consents').insert(consents);

      if (error) throw error;

      toast({
        title: 'Consentimento registrado',
        description: 'Suas preferências foram salvas com sucesso.',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error saving consent:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar seu consentimento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bem-vindo ao 9FIT!</DialogTitle>
          <DialogDescription>
            Para continuar, precisamos do seu consentimento para processar seus dados.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="terms"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Termos de Uso (Obrigatório)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Aceito os termos de uso da plataforma 9FIT, incluindo responsabilidades sobre uso de treinos e informações fornecidas.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="privacy"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Política de Privacidade (Obrigatório)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Autorizo o processamento dos meus dados pessoais conforme a LGPD, incluindo:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-4">
                    <li>Dados cadastrais (nome, email, telefone)</li>
                    <li>Dados de saúde (avaliações físicas, medidas)</li>
                    <li>Dados de treino e progresso</li>
                    <li>Fotos de progresso (quando fornecidas)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="marketing"
                  checked={acceptedMarketing}
                  onCheckedChange={(checked) => setAcceptedMarketing(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="marketing"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Comunicações de Marketing (Opcional)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Aceito receber comunicações sobre novidades, promoções e conteúdos exclusivos por email e WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Seus Direitos LGPD</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Confirmação de processamento dos seus dados</li>
                <li>✓ Acesso aos seus dados</li>
                <li>✓ Correção de dados incompletos ou incorretos</li>
                <li>✓ Anonimização, bloqueio ou eliminação</li>
                <li>✓ Portabilidade dos dados</li>
                <li>✓ Informação sobre compartilhamento</li>
                <li>✓ Revogação do consentimento</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Para exercer seus direitos, acesse <strong>Perfil → Suporte → Privacidade LGPD</strong>
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={loading || !acceptedTerms || !acceptedPrivacy}
            className="w-full"
          >
            {loading ? 'Salvando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
