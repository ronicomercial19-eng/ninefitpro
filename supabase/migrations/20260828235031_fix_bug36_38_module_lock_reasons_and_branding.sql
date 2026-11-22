-- FIX #36: motivo específico por módulo "aguardando", em vez de status genérico
ALTER TABLE public.physio_modules ADD COLUMN IF NOT EXISTS lock_reason text;

UPDATE public.physio_modules SET lock_reason = 'em_desenvolvimento'
WHERE connector_key IN ('staff','ron','progress','store_9fit','foods_9','zap_9');

-- FIX #38: padroniza "Ron" -> "RON" (marca sempre maiúscula)
UPDATE public.physio_modules SET name = 'RON' WHERE key = 'ron';;
