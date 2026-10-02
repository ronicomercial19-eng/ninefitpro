# Treino Rápido — entrega e QA

## Implementado
- [x] Três perguntas: objetivo, tempo e recursos combináveis.
- [x] Calibração completa: sono, energia, humor, motivação e dor.
- [x] Revisão de restrições e localização da dor antes da geração.
- [x] Escolha entre plano previsto e sessão rápida; retomada de sessão em andamento.
- [x] Prescrição persistida com séries, repetições, descanso e duração estimada.
- [x] Seleção considera nível, fase informada, recursos e exercícios concluídos recentemente.
- [x] Vídeo vinculado ao exercício escolhido; instruções quando não há mídia.
- [x] Protocolos, infoprodutos e ebooks em campos separados, respeitando acesso da biblioteca.
- [x] Início vinculado ao treino exato, sem duplicar execução e sem oferta comercial obrigatória.
- [x] Migração 20261002145040 aplicada ao Supabase.
- [x] TypeScript, build e testes de regras aprovados; permissões RPC e vínculo persistente verificados.

## Checklist para QA do usuário
- [ ] Calibração nova, completa e antiga com respostas ausentes.
- [ ] Dor localizada e restrições encaminham para ajuste/revisão.
- [ ] Plano previsto, sessão rápida e retomada mantêm o treino correto.
- [ ] Validar os quatro objetivos e tempos de 15, 30, 45 e 60 minutos.
- [ ] Validar peso corporal, halteres, elásticos, combinações e academia.
- [ ] Conferir vídeos reais, instruções e reprodução em celular.
- [ ] Iniciar, pausar, retomar e concluir; verificar histórico sem duplicação.
- [ ] Conferir conteúdos relacionados, bloqueados e ausência de recomendações.
- [ ] Validar teclado, fechamento, carregamento e erros de conexão.
- [ ] Publicar/verificar a versão no Lovable após sincronização do GitHub.

## Dependências e limites
- O catálogo tem metadados incompletos de equipamento e nível. Combinações sem exercícios comprovadamente compatíveis mostram indisponibilidade; precisam de curadoria da biblioteca, sem relaxar filtros.
- A duração é estimada, incluindo três minutos de preparação; ritmo e pausas reais variam.
- Não foi feita QA funcional com contas reais, conforme preferência do usuário.
- Revisar os alertas gerais de segurança do projeto Supabase em tarefa própria, incluindo views com privilégios e configuração de autenticação. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view . As RPCs alteradas verificam o proprietário e não permitem execução por anon.
