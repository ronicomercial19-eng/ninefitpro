update public.api_connectors set iframe_url='https://staff-connect-bce247b7.base44.app/', status='active', updated_at=now() where key='staff';
update public.api_connectors set iframe_url='https://ninefit.lovable.app/', status='active', updated_at=now() where key='store_9fit';
update public.physio_modules set cta_route='https://staff-connect-bce247b7.base44.app/' where key='staff';
update public.physio_modules set cta_route='https://ninefit.lovable.app/' where key='store';;
