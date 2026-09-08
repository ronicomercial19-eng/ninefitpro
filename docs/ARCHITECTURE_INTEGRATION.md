# Arquitetura de Integração — NineFit

## Decisão de fonte da verdade
- Repositório principal: `ronicomercial19-eng/ninefitpro`
- Branch protegida: `main`
- Branch de trabalho: `integracao-ninefitpro-dash`
- `ninefitpro-`: fonte de funcionalidades a avaliar
- `9fit`: legado/backup; não contém código de aplicação relevante

## Camadas
1. **Apresentação** — `src/pages`, `src/components`, `src/components/layout`
2. **Estado e orquestração** — `src/hooks`, contextos e roteamento
3. **Domínio e dados** — `src/services`, `src/data`, contratos tipados
4. **Infraestrutura** — `src/integrations`, `supabase/functions`, migrations
5. **Recursos estáticos** — `public`

## Ordem de integração
1. Compartilhamento, recap e notificações.
2. Hooks e serviços necessários.
3. Fluxo de treino do aluno.
4. Edge Functions e migrations, somente após revisar contratos.
5. PWA/service worker.

## Regras
- Não copiar arquivos sem revisar imports, contratos e dependências.
- Não alterar `main` durante a integração.
- Não versionar segredos; usar variáveis de ambiente.
- Cada bloco deve passar TypeScript, ESLint, build e teste funcional.
- Preservar metas, progresso e integrações mais recentes do `ninefitpro`.

## Critérios de aceite
- Build de produção concluído.
- Lint e TypeScript sem erros.
- Autenticação, treino, progresso e metas preservados.
- Novas funcionalidades testadas.
- Nenhuma chave ou segredo exposto.
