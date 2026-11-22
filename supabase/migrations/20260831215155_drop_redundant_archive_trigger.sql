-- Item G (correção): descobri que já existia trg_archive_previous_annual_plan
-- (AFTER INSERT OR UPDATE OF status), que faz exatamente o mesmo trabalho do
-- trigger que criei (trg_archive_previous_active_plan, BEFORE INSERT) — e o
-- pré-existente é mais completo (cobre também UPDATE de status pra 'active',
-- não só INSERT). Removendo o meu para não duplicar a mesma UPDATE a cada insert.
drop trigger if exists trg_archive_previous_active_plan on periodization_annual_plans;
drop function if exists fn_archive_previous_active_plan();;
