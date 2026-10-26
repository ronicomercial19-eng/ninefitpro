import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_EMAIL } from '@/config/commercialOffer';

export function AppSupport({ initialMessage = "" }: { initialMessage?: string } = {}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setResult('');
    try {
      const { data, error } = await supabase.functions.invoke('fitpro-support', { body: { subject, message } });
      if (error || !data?.id) throw new Error('send');
      setResult(data.email_sent ? `Solicitação ${data.id} registrada e encaminhada. Resposta por e-mail em até 24 horas.` : `Solicitação ${data.id} registrada, mas o encaminhamento por e-mail não foi confirmado. Use o e-mail abaixo para falar diretamente com a equipe.`);
      setMessage('');
    } catch { setResult('Não foi possível confirmar o envio. Tente novamente ou envie diretamente pelo e-mail abaixo.'); }
    finally { setBusy(false); }
  }
  return <section id="suporte" className="rounded-xl border border-border p-4 space-y-3" aria-label="Suporte NINE FIT">
    <h2 className="font-bold">Suporte NINE FIT</h2>
    <p className="text-sm text-muted-foreground">Envie pelo app. Nossa equipe responde por e-mail em até 24 horas. Suporte de uso e acesso; não é consulta profissional ou atendimento de urgência.</p>
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">Assunto<input required minLength={3} maxLength={120} value={subject} onChange={e => setSubject(e.target.value)} className="block w-full rounded-lg border border-border bg-background p-3 mt-1" /></label>
      <label className="block text-sm">Mensagem<textarea required minLength={10} maxLength={3000} value={message} onChange={e => setMessage(e.target.value)} className="block w-full rounded-lg border border-border bg-background p-3 mt-1" /></label>
      <p className="text-xs text-muted-foreground">Seu e-mail da conta, assunto e mensagem serão encaminhados à NINE FIT. Não envie senhas, dados de cartão ou exames.</p>
      <button disabled={busy} className="bg-primary text-primary-foreground rounded-lg p-3 disabled:opacity-50">{busy ? 'Enviando…' : 'Enviar ao suporte'}</button>
    </form>
    <p role="status" className="text-sm">{result}</p>
    <a className="text-primary underline text-sm" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  </section>;
}
