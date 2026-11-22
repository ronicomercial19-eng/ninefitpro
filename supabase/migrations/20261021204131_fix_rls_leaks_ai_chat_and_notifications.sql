-- ai_chat_messages: qualquer usuário logado lia TODAS as mensagens (policy true). Mantém só "own rows" + admin.
drop policy if exists "Permitir leitura de mensagens" on public.ai_chat_messages;
drop policy if exists "Permitir envio de mensagens" on public.ai_chat_messages;
create policy "admin reads ai messages" on public.ai_chat_messages
  for select to authenticated using (public.is_admin(auth.uid()));

-- notifications: INSERT com check true para role public permitia qualquer um (até anon) criar notificação para qualquer usuário.
drop policy if exists "Sistema insere notificações" on public.notifications;;
