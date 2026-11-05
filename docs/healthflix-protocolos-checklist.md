# HealthFlix e protocolos no FitPro

| # | Melhoria por impacto | Professor | Aluno | Verificação |
|---|---|---|---|---|
| 1 | Restaurar o conector HealthFlix | Catálogo externo completo | Acesso às aulas do provedor | [x] Proxy v60 publicado. Sessão autenticada retornou 126 itens no catálogo externo. |
| 2 | Preservar mídia da origem na conciliação | Prévia e atribuição disponíveis | Vídeo e capa preservados quando o registro local estiver incompleto | [x] Implementado na main |
| 3 | Preservar acesso ao conteúdo já atribuído | Atribuições seguem consultáveis | Atalho aos protocolos quando o catálogo externo falhar | [x] Implementado na main |
| 4 | Permitir nova tentativa sem reiniciar a página | Recuperar catálogo após falha | Tentar novamente na própria tela | [x] Implementado na main |
| 5 | Validar link antes da atribuição | Botão disponível para mídia com URL segura | Menos atribuições sem reprodução | [x] Implementado na main |
| 6 | Dar identidade FitPro à entrada de protocolos | Entrega visual coerente com o produto | Título, origem e leitura priorizados | [x] Implementado na main |
| 7 | Organizar exercícios como sequência | Prescrição apresentada com ordem e dose | Linhas numeradas e valores fáceis de comparar | [x] Implementado na main |
| 8 | Confirmar o catálogo e a visibilidade por perfil | Conferir total publicado e conteúdos ocultos | Acessar somente o conteúdo disponível | [ ] Contadores e regras de visibilidade implementados. Falta comparar os dois perfis autenticados. |
| 9 | Validar atribuição, reprodução e retomada | Acompanhar o progresso da aula | Retomar de onde parou | [ ] Atribuição, gravação e retomada implementadas. Falta reproduzir, sair e reabrir com aluno de teste. |
| 10 | Confirmar conclusão nos dois painéis | Ver conclusão na ficha do aluno | Ver protocolo concluído | [ ] A ficha do professor lê o mesmo registro do aluno. Falta concluir um vídeo de teste e conferir nos dois perfis. |
