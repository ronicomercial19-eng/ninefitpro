# Handoff — Fase 5 · RON

Data: 2026-11-09
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- Uma falha ao ler `ai_chat_messages` só ia para o console. A tela ficava com a saudação de conversa nova, igual a um histórico confirmado como vazio.
- Com essa falha, `?auto=1` ainda acrescentava uma fala local do RON, como se a conversa tivesse sido lida.
- Se o coach voltasse sem texto, o balão recebia "Entendido! Processando diretrizes." Essa frase não veio do modelo.

## O que foi feito

- Enquanto a conversa carrega, o chat diz "Lendo a conversa…". A saudação não aparece nesse intervalo.
- Falha de leitura: "Não foi possível carregar a conversa. Isso não significa que ela está vazia." O botão tenta de novo. A saudação de conversa vazia não entra.
- Conversa vazia continua vazia, com a mesma saudação, só depois que a consulta volta sem mensagens.
- Sem texto do coach, o balão mostra o erro já usado pelo serviço: "O RON não retornou uma resposta válida. Tente novamente." Nada de frase pronta.
- A abertura automática por URL espera a leitura confirmar. Se a leitura falha, ela não fala no lugar do coach.
- A regra está em `src/components/9fit/ronConversation.ts`.

## O que não foi mexido

- Aviso de ficha do Hub e do Perfil, brief semanal e selo de ciclo.
- Train, Início, checkout e o painel do professor.
- Aba Equipe, fichas, relato de dor, ações propostas e o texto que confirma a redução de volume depois de uma resposta real.
- A saudação quando a consulta confirma que não há histórico.
- `ai-coach` e o contrato de ações.

## Próximo passo

Fase 6 — módulos do ecossistema: conferir se um módulo sem leitura ainda aparece como desligado ou sem conteúdo. Não reabrir a conversa do RON nem o aviso de ficha.
