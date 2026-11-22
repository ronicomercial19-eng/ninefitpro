update public.physio_modules set cta_route='/9fit/dieta', updated_at=now() where key='foods' or lower(name) in ('foods','nutri','nutrição');;
