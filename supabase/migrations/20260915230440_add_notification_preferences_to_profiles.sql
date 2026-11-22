-- QA roadmap Fase B (07/09): SettingsPage.tsx > aba Notificações era 100%
-- decorativa — toggles nunca persistiam, o botão "Salvar Preferências" só
-- mostrava um toast de sucesso falso sem gravar nada.
ALTER TABLE public.profiles
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT
  '{"email":true,"push":true,"sms":false,"newStudent":true,"paymentReminder":true}'::jsonb;;
