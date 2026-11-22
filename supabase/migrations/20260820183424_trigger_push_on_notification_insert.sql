
CREATE OR REPLACE FUNCTION public.fn_dispatch_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'url', COALESCE(NEW.action_url, '/9fit/perfil')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push_on_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.fn_dispatch_push_on_notification();
;
