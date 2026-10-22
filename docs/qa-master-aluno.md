# QA MASTER — Aluno FitPro

Fonte: dossiê Manus, avaliação de 11/09/2026. Relato histórico não equivale a reprodução atual.
Separado do painel professor (/app) e da STEVENT (outro sistema).

## Fila de correção e reteste

| IDs do dossiê aluno | Frente | Estado em 22/10/2026 |
| --- | --- | --- |
| QA-001, QA-002, QA-005 | Água, HRV e rota de Início | Código atual possui hidratação em Dieta, diálogo HRV/BPM e redirect /9fit/home → /9fit/os. Pendente reteste autenticado e persistência. |
| QA-003, QA-004 | RON e fonte dos indicadores | Prioridade P0: rastrear origem, timestamp, cache por conta e ausência de sinais; não declarar reconciliado. |
| QA-006, QA-007 | Equipe | Perfil já consome diretório real; seleção externa STEVENT é frente distinta. Pendente fluxo completo. |
| QA-008, QA-014 | Histórico e Share | Histórico foi reconstruído; pendente confronto de cada indicador com Share, sem converter ausência de avaliação em ausência de treino. |
| QA-009, QA-010, QA-011 | Planejamento, ajuste e aderência | Mudanças recentes exigem reteste: distinguir treino rápido, planejado e execução concluída. |
| QA-012, QA-013 | Protocolos e calibração | Conclusão de rotina não mede HRV. Validar invalidação de cache, XP sem duplicidade e explicação das fontes. |
| QA-015 | Plano comercial | Pendente validar benefícios, assinatura e sandbox sem realizar compra. |
| QA-016 | HealthFlix | Pendente filtros, reprodução e tracking com dados autorizados. |
| QA-017, QA-018 | Idioma e perfil | Pendente padronização e preenchimento inicial sem sobrescrever dados. |

## Critério de encerramento

Cada item requer evidência atual, correção quando reproduzido e regressão. Não aprovar por aparência da tela ou flags de roadmap. Testes com gravação, IA paga ou dados clínicos reais dependem de contexto autorizado; não resetar conta nem criar métricas fictícias.
