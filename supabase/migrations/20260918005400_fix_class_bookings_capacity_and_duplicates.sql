-- QA Fase F (16/09): Aulas.tsx (aluno) permitia agendar aulas sem nenhum
-- controle real de capacidade — available_slots nunca era decrementado no
-- insert de class_bookings (sem trigger nenhum na tabela), então o número
-- de "vagas" mostrado era só decorativo e a turma podia ser sobrelotada
-- infinitamente. Também não havia constraint impedindo o mesmo usuário
-- agendar a mesma aula duas vezes.

-- 1) Impede o mesmo usuário ter 2 bookings confirmados na mesma aula.
CREATE UNIQUE INDEX class_bookings_unique_active
  ON public.class_bookings (class_id, user_id)
  WHERE status = 'confirmed';

-- 2) Trava a vaga de verdade no insert (lock da linha evita corrida entre
-- 2 inserts simultâneos), e devolve a vaga automaticamente ao cancelar.
CREATE OR REPLACE FUNCTION public.fn_reserve_class_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slots integer;
BEGIN
  IF NEW.status = 'confirmed' THEN
    SELECT available_slots INTO v_slots
    FROM public.gym_classes
    WHERE id = NEW.class_id
    FOR UPDATE;

    IF v_slots IS NULL OR v_slots <= 0 THEN
      RAISE EXCEPTION 'Turma lotada' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.gym_classes SET available_slots = available_slots - 1 WHERE id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_reserve_class_slot
  BEFORE INSERT ON public.class_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_reserve_class_slot();

CREATE OR REPLACE FUNCTION public.fn_release_class_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'confirmed' THEN
    UPDATE public.gym_classes SET available_slots = available_slots + 1 WHERE id = OLD.class_id;
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_release_class_slot_on_delete
  AFTER DELETE ON public.class_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_release_class_slot();

CREATE TRIGGER trg_release_class_slot_on_cancel
  AFTER UPDATE OF status ON public.class_bookings
  FOR EACH ROW
  WHEN (OLD.status = 'confirmed' AND NEW.status <> 'confirmed')
  EXECUTE FUNCTION public.fn_release_class_slot();;
