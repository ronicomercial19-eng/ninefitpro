# Fluxos do professor: ficha, modelos e skills

- Acompanhamento mantém o botão Liberar acesso e oferece oito abas com o contexto do aluno selecionado. Anamnese permite gravar e consultar respostas; Mensalidade abre a concessão de cortesia existente.
- Atalhos no topo preservam o aluno entre ficha, treino, modelos, super séries, séries de referência e skills.
- Modelos: escolher fonte aprovada, escolher aluno, revisar exercícios/dose/data e confirmar. Fontes HTML legadas com títulos numerados são convertidas em rascunho; associações não reconhecidas exigem seleção explícita do catálogo. O campo de nome original substitui referências literais existentes no HTML. A prévia usa nome e PDI; a dose exige revisão do profissional.
- A função de atribuição publica a sessão pelo mesmo contrato de edição do professor. Guarda a fonte, versão, PDI, autor, programação e identificador da entrega. Repetições do mesmo pedido são idempotentes. Sessões iniciadas, datas passadas, versões alteradas e alunos de outro professor são recusados. Cada confirmação publica um dia; o professor escolhe a distribuição dos demais dias.
- Train Hoje prioriza a sessão diária, identificada pelo nome do modelo. O HTML personalizado permanece nos protocolos e na ficha; a atribuição HTML não aparece como sessão duplicada no Train.
- Cinco exemplos em exercícios, super séries, séries de referência e modelos aprovados, sem criar treinos ou conclusões em alunos reais.
- Skills: o runtime usa apenas publicações ativas com ativação global, do professor ou do aluno. Envia definição e contexto autorizado à IA, retorna versão e registra evento complete. Skills especializadas abrem o módulo correspondente. Publicar uma skill não configura fornecedores de vídeo, sensores ou cobrança. Rascunhos permanecem desativados.
- Recomendações fora da semana exibem explicação e a ação Nova prescrição de hoje; a validação do servidor permanece.

Validação: TypeScript, build Vite, scripts/qa-professor-models-db.mjs (Postgres PGlite usando o publicador real), scripts/qa-professor-models-browser.mjs (Playwright com APIs de teste), scripts/qa-professional-skills.cjs. A validação no navegador não usa alunos reais nem confirma acesso/cobranças.
