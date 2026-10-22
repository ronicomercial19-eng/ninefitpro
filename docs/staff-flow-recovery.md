# Recuperação do acesso ao 9FIT Staff

## Evidências verificadas

- Git: e1f351d adicionou card Staff; 1a1b5ad retirou o card extra. O fallback restante aponta à agenda, não à seleção externa. NativeSystem redirecionava app=staff à própria Equipe, impedindo o embed.
- Lovable FitPro 9c713e4a-7db8-48ba-829c-18abc2bf4a27: fonte sincronizada com o commit 34e44f4 no momento da consulta.
- Lovable Stevent dca68a10-ac01-4f6d-91b3-29b063e38990: App.tsx registra /fitpro-staff para pages/FitProStaff.tsx. O arquivo contém exatamente a entrada Cliente / Staff–Prof do print, com etapas Entry, Cat, Met, Eng e Journey.
- Navegador: https://stevent.lovable.app/fitpro-staff abriu Modo de operação com as duas opções. Não foi criada reserva nem enviada comunicação.
- Prévia local: /9fit/native-system?app=staff carregou o iframe com Modo de operação, Cliente e Staff / Prof, além do aviso demonstrativo e acesso à agenda FitPro. Typecheck e build/PWA concluíram com sucesso. O clique no card com conta autenticada não foi exercitado nesta rodada.
- Supabase FitPro mfrydtrzjxscbkaiwfnw: staff-api ACTIVE, versão 45. Consulta de metadados confirmou tabelas class_bookings e integration_events_log; nenhum dado de usuário ou segredo foi consultado.

## Alteração

Card/cabeçalho clicável no topo da aba Equipe, independente do carregamento do diretório, abre /9fit/native-system?app=staff. O container reutiliza a URL canônica já existente, preserva retorno, oferece abertura externa e mantém o fluxo dentro do FitPro por iframe. Diretório e agenda nativos preservados. Não envia token, dados clínicos ou perfil ao domínio externo.

## Limite operacional

O componente externo usa PROFESSIONALS e bookings demonstrativos e simulações por timers; a chamada externa encontrada nessa página é staff-api/access-check. A existência da função staff-api no FitPro não comprova ligação da seleção externa ao booking real. Por isso card e container declaram prévia demonstrativa, com acesso à agenda FitPro. Não foi alterado o projeto externo, seu login ou banco. Esta entrega restaura acesso à tela, não certifica agendamento ponta a ponta ou SSO.
