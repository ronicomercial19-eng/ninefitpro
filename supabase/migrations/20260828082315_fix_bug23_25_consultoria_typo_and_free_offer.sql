-- FIX #25: typo "PERFOMANCE" -> "PERFORMANCE"
UPDATE public.monetization_offers
SET name = 'Consultoria de Performance', description = 'Faça uma avaliação 360 gratuita.'
WHERE id = '1679b21e-4b24-4984-add4-09c7b120d168';;
