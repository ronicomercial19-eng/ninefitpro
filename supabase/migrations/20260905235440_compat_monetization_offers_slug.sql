-- front pede .slug em monetization_offers; nunca existiu. Gerado a partir do nome.
ALTER TABLE public.monetization_offers ADD COLUMN IF NOT EXISTS slug text GENERATED ALWAYS AS (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) STORED;
CREATE INDEX IF NOT EXISTS idx_monetization_offers_slug ON public.monetization_offers(slug);;
