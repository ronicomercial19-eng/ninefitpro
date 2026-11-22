-- Item F: expõe de forma segura quais modelos do banco têm conteúdo real (macrocycle preenchido),
-- evitando o erro "cannot get array length of a non-array" que ocorre com AND direto no WHERE.
create or replace view periodization_models_valid as
select *
from periodization_models
where case when jsonb_typeof(macrocycle) = 'array' then jsonb_array_length(macrocycle) else 0 end > 0;;
