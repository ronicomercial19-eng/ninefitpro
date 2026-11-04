# Player guiado e execução

O player exibe progresso por séries previstas, próxima ação, dose, carga e repetições junto ao exercício. RON e wearable são expansíveis. A retomada só libera interação após hidratar as séries e abre o primeiro exercício pendente.

Gravações de série têm trava contra duplo toque. Falhas revertem somente a marcação otimista, preservam a tela e permitem nova tentativa. Conclusão parcial pede confirmação em todas as entradas. A conclusão só abre avaliação após confirmação do servidor; falha de telemetria secundária não impede esse passo. Os contratos existentes de conclusão e critérios de validade são preservados.

O cronômetro de descanso usa prazo absoluto e sincroniza ao retornar à aba. Trocar exercício interrompe o descanso anterior. O tempo de execução acompanha o relógio e mantém o tempo acumulado por execução no armazenamento da sessão. O servidor continua sendo a fonte dos registros das séries.

Validação: TypeScript e Vite; QA_BASE_URL=http://127.0.0.1:4183 node scripts/qa-guided-player-browser.mjs. O teste monta um harness temporário e simula as APIs: falha/retry de série, carga/repetições reais, descanso, navegação, cancelamento de conclusão parcial, reload com retomada e falha/retry de conclusão. Nenhum treino real é gravado pelo teste.
