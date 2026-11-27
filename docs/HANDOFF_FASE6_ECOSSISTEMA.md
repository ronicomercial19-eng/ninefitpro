# Handoff — Fase 6 · Módulos do ecossistema

Data: 2026-11-27
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- Uma falha ao ler `physio_modules` ou `api_connectors` marcava todos os módulos como `waiting`.
- No explorador (`/9fit/modules`) isso virava "Catálogo em modo de reserva". No card, "Catálogo temporariamente indisponível" ou "Integração não configurada". O contador caía em "0 DE N DESTINOS CONFIGURADOS".
- A lista conhecida continuava na tela, mas parecia desligada. Ausência confirmada e falha de leitura eram a mesma frase.
- Um refresh que falhava apagava nomes, status e iframes já confirmados e repetia o modo de reserva.
- O estado de erro com "Tentar novamente" existia no componente e nunca era usado.

## O que foi feito

- A regra está em `src/components/9fit/ecosystemCatalogRead.ts`.
- Primeira falha: os módulos conhecidos continuam abríveis pelas rotas do app. O texto é "Leitura do módulo não confirmada". O aviso diz que o catálogo não foi confirmado e que isso não significa que os módulos estão desligados. Há "Tentar novamente".
- Categoria sem módulo conhecido nessa falha não diz "Nenhum módulo disponível".
- Leitura confirmada não muda: parceiro, tela no app, serviço externo e integração não configurada continuam com as frases de antes. Zero configurado continua zero só depois da leitura.
- Refresh que falha, no mesmo escopo, mantém a lista, o status e o iframe. O aviso é "Não foi possível atualizar. A última leitura confirmada continua na tela." Outra categoria não reaproveita a leitura anterior.
- Enquanto já existe catálogo confirmado, o refresh não troca a tela por esqueleto.

## O que não foi mexido

- Hub, Train, Início, Perfil, RON e o aviso de ficha.
- Rotas dos módulos, overlay, holograma, cores e o que cada módulo faz depois de aberto.
- Painel do professor, conectores, Vault e migrações.
- SmartTreino, SmartPeriodizer, Progress, Postura Pro e HealthFlix seguem com os frontends próprios.
- Comunidade e Postura Pro continuam com a dependência externa de [auditoria-integracoes-professor-2026-11-01.md](auditoria-integracoes-professor-2026-11-01.md).

## Como conferir

- Antes da resposta: esqueleto, sem "modo de reserva" e sem "0 destinos".
- Primeira falha: "Leitura do módulo não confirmada", módulos conhecidos ainda abrem, botão de nova tentativa.
- Com catálogo já lido, falhar a atualização não troca "Disponível no app" por reserva nem por "não configurada".
- Teste: `node --import tsx --test src/lib/__tests__/ecosystemCatalogRead.test.ts`.

## Próximo passo

Fase 7 — painel do professor: tornar funcional o que ainda depende de API, sem reabrir a leitura do catálogo do aluno nem as fases 1 a 5.
