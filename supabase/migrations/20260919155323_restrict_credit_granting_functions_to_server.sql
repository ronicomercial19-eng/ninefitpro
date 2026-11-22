-- adicionar_fichas, fn_add_credits, fn_activate_prime_reward e
-- iniciar_trial_prime CONCEDEM crédito/acesso pago — nunca deveriam ser
-- chamáveis livremente pelo cliente (qualquer atleta logado podia se dar
-- fichas infinitas ou ativar/reativar o trial Prime à vontade, de graça).
-- Restringe a service_role (chamadas server-side: webhook de pagamento,
-- ação do professor, etc.), igual já é o padrão certo do resto do sistema.
REVOKE EXECUTE ON FUNCTION public.adicionar_fichas(uuid, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_add_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_activate_prime_reward(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.iniciar_trial_prime(uuid) FROM PUBLIC, anon, authenticated;;
