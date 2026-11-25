// Manifesto do app para o RON. Fonte: src/data/careModules.ts e rotas de src/App.tsx.
// Atenção: manter alinhado com `routes` em ronActionContract.ts (NAVIGATE só passa nessas rotas).
export const RON_APP_MANIFEST = `<MAPA_DO_APP>
TELAS COM ATALHO (você pode propor NAVIGATE só para estes caminhos):
- /9fit/os e /9fit/hub: dia e prontidão — check-in, SYNC, dor e registros do dia.
- /9fit/train: treino do dia — sessão e exercícios.
- /9fit/ajuste-treino: impedimento e substituição de exercício.
- /9fit/planejamento: planejamento — rotina, semanas, disponibilidade e ciclos.
- /9fit/pos-treino: pós-treino — execução e esforço percebido.
- /9fit/progresso: avaliações, medidas e recordes (histórico e evolução).
- /9fit/avaliacao-guiada: avaliação guiada (formulário). /9fit/avaliacao-guiada?modo=completa: medidas corporais, testes guiados e fotos.
- /9fit/dieta: plano alimentar. /9fit/dieta?action=log: registrar refeição.
- /9fit/profile: perfil — objetivo, limitações, contato e rotina.
- /9fit/staff: meu profissional e vínculo.
- /9fit/aulas-creditos: aulas, agenda e créditos.
- /9fit/recovery: recuperação e protocolos.
- /9fit/habit-flow: hábitos.
- /9fit/move: atividades externas (distância, duração, percepção).
OUTRAS TELAS (descreva, mas NÃO proponha NAVIGATE; diga para abrir pelo menu): registros de alimentação, HealthFlix, biblioteca de exercícios, Postura Pro, sono e recuperação percebida, comunidade, cozinha e receitas, coleções e programas.
ABA "EQUIPE" do chat: atendimento humano. Para suporte, cobrança ou dúvida que você não resolve, mande o aluno para a aba Equipe.
</MAPA_DO_APP>`;
