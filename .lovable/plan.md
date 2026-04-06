

# Plano de Implementacao - Fix IA + API Exercicios + Componentes Admin

## 1. Fix: Analise IA e Recomendacoes falham

**Problema:** `AIAnalysisPage.tsx` e `AIChatPage.tsx` nao processam corretamente a resposta da edge function `ai-coach`.

A edge function retorna `{ success, data: { content }, metadata }`. Quando chamado via `supabase.functions.invoke()`, o resultado chega como `result.data` = `{ success, data: { content }, metadata }`. O codigo atual faz `result?.content` mas deveria fazer `result?.data?.content`.

No `AIChatPage.tsx`, o chat usa `fetch()` diretamente com `Authorization: Bearer ANON_KEY` - isso falhara porque a edge function agora requer JWT de usuario autenticado (fix de seguranca anterior). Precisa usar o token de sessao do usuario.

**Fix:**
- `AIAnalysisPage.tsx`: Corrigir acesso `result?.data?.content` em ambos `runAnalysis` e `runRecommendations`
- `AIChatPage.tsx`: Usar `(await supabase.auth.getSession()).data.session?.access_token` no header Authorization

## 2. Integracao API Biblioteca de Exercicios 9FIT

**API Externa:** `https://id-preview--532c9940-31b6-4987-968f-fd292029beee.lovable.app/api/exercises.json`

Retorna: `{ id, name, category, subcategory, youtubeId }`

**Implementacao:**
- Criar Edge Function `sync-exercise-library` que:
  - Busca exercicios da API externa
  - Para cada exercicio, faz upsert na tabela `exercises` mapeando:
    - `name` -> `name`
    - `category` -> `equipment` ou novo campo
    - `subcategory` -> `target_muscles[0]`
    - `youtubeId` -> `video_url` (formato `https://youtube.com/embed/{youtubeId}`)
    - `external_video_id` -> `youtubeId`
    - `gif_url` -> thumbnail `https://img.youtube.com/vi/{youtubeId}/mqdefault.jpg`
  
- Na `ExercisesPage.tsx`: Adicionar botao "Sincronizar Biblioteca 9FIT" que chama a edge function
- Na montagem de treino do aluno: professor seleciona exercicios do catalogo e o video do YouTube e reproduzido para o aluno

## 3. Assistente IA Dual (Admin + Aluno)

**Admin (AIChatPage.tsx):** Ja funciona como assistente do professor para ajuste, facilitacao. Corrigir auth (item 1) e manter papel de ajudar o prof a monitorar, recomendar, corrigir.

**Aluno (Hub/Train):** Manter funcionalidade existente de Fit360 Copilot que ja ajuda, corrige, monitora o aluno.

## 4. Placeholder SmartTreino no Sidebar

Substituir rotas `super-series` e `series-referencia` por um unico item "SmartTreino" no sidebar que abre componente placeholder com mensagem "Conecte a API do SmartTreino para ativar".

## 5. Componentes Placeholder: SmartPeriodizer e FitCopilot

Criar 2 novas paginas placeholder no painel admin:
- `/app/smart-periodizer` -> componente com card informativo "SmartPeriodizer - Conecte a API para ativar periodizacao inteligente"
- `/app/fit-copilot` -> componente com card informativo "FitCopilot - Conecte a API para ativar o copiloto de treino"

Adicionar rotas em `App.tsx` e itens no `AppSidebar.tsx`.

## Ordem de Execucao

| # | Tarefa | Tipo |
|---|--------|------|
| 1 | Fix auth e response parsing no AIAnalysisPage e AIChatPage | Edit 2 arquivos |
| 2 | Criar edge function sync-exercise-library + botao sync | Edge Function + Edit |
| 3 | Substituir SuperSeries/SeriesRef por SmartTreino placeholder | Edit Sidebar + App.tsx |
| 4 | Criar placeholders SmartPeriodizer e FitCopilot | 2 paginas novas + rotas |

**Total:** 1 Edge Function nova, 2 paginas novas, 4 arquivos editados

