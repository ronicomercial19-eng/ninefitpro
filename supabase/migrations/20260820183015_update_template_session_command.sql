UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{{aluno_nome}} | Session Command</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@700&family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500&display=swap');
  :root { --hybrid-red: #E8571A; --bg-black: #050505; --card-gray: #0d0d0d; --accent-blue: #3e94ff; }
  body { font-family: 'Inter', sans-serif; background-color: var(--bg-black); color: #ffffff; overflow-x: hidden; }
  .font-brand { font-family: 'Syncopate', sans-serif; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .metric-card { background: linear-gradient(145deg, #111111 0%, #080808 100%); border: 1px solid #1a1a1a; }
  .timer-glow { text-shadow: 0 0 20px rgba(232,87,26,0.4); }
  .check-btn.completed { background: #3eff95; color: #000; }
</style>
</head>
<body class="p-4 md:p-8">
<header class="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
  <div>
    <div class="flex items-center gap-3 mb-2">
      <span class="w-3 h-3 rounded-full bg-orange-600 animate-pulse"></span>
      <span class="text-[10px] font-black tracking-[0.4em] text-orange-500 uppercase">Live Session Protocol</span>
    </div>
    <h1 class="text-4xl font-brand tracking-tighter">{{titulo_sessao}}<span class="text-orange-600">.</span></h1>
    <p class="text-zinc-500 text-sm mt-1">Atleta: {{aluno_nome}} | {{ciclo_nome}}</p>
  </div>
  <div class="flex gap-4">
    <div class="metric-card p-4 rounded-xl text-center min-w-[120px]">
      <p class="text-[9px] font-black text-zinc-500 uppercase mb-1">Duração</p>
      <p class="text-xl font-mono text-white">{{duracao_total}}<span class="text-xs ml-1 text-zinc-400">MIN</span></p>
    </div>
  </div>
</header>
<main class="max-w-6xl mx-auto space-y-8">
  {{#each fases}}
  <section class="metric-card rounded-3xl overflow-hidden border-zinc-800">
    <div class="bg-zinc-900/50 p-6 flex justify-between items-center border-b border-zinc-800">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center border text-xl" style="background:{{this.cor_bg}};border-color:{{this.cor_borda}};color:{{this.cor_texto}}">{{this.icone}}</div>
        <div>
          <h2 class="font-bold text-lg uppercase tracking-tight">{{this.titulo}}</h2>
          <p class="text-[10px] text-zinc-500 uppercase font-black">Foco: {{this.foco}}</p>
        </div>
      </div>
      <span class="text-[10px] font-black px-3 py-1 rounded" style="background:{{this.cor_bg_badge}}">{{this.duracao}}</span>
    </div>
    {{#if this.tabela}}
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead><tr class="text-[10px] text-zinc-500 uppercase border-b border-zinc-900">
          <th class="p-6">Exercício</th><th class="p-6">Sets/Reps</th><th class="p-6">Descanso</th><th class="p-6">Check</th>
        </tr></thead>
        <tbody class="divide-y divide-zinc-900">
        {{#each this.exercicios}}
          <tr class="hover:bg-zinc-900/20 transition-colors">
            <td class="p-6"><p class="font-bold text-sm">{{this.nome}}</p><p class="text-[10px] text-zinc-500">{{this.nota_tecnica}}</p></td>
            <td class="p-6 font-mono text-sm">{{this.series}} x {{this.reps}}</td>
            <td class="p-6 font-mono text-sm">{{this.descanso}}</td>
            <td class="p-6"><button onclick="toggleCheck(this)" class="check-btn w-6 h-6 border-2 border-zinc-700 rounded flex items-center justify-center">✓</button></td>
          </tr>
        {{/each}}
        </tbody>
      </table>
    </div>
    {{/if}}
  </section>
  {{/each}}
</main>
<div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl backdrop-blur-xl shadow-2xl z-50 flex items-center justify-between">
  <div class="flex flex-col">
    <span class="text-[8px] font-black text-orange-500 uppercase tracking-widest">Sessão em Curso</span>
    <span id="timer-display" class="font-mono text-xl timer-glow">00:00:00</span>
  </div>
  <div class="flex gap-2">
    <button onclick="startTimer()" id="play-btn" class="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></button>
    <button onclick="resetTimer()" class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm-6.23 2.1L4.31 4.64C3.27 5.86 2.6 7.35 2.6 9c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8z"/></svg></button>
  </div>
</div>
<script>
  let seconds = 0, timer = null;
  function startTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    else { timer = setInterval(() => { seconds++; updateDisplay(); }, 1000); }
  }
  function resetTimer() { clearInterval(timer); timer = null; seconds = 0; updateDisplay(); }
  function updateDisplay() {
    const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60), s = seconds%60;
    document.getElementById('timer-display').innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function toggleCheck(btn) { btn.classList.toggle('completed'); btn.closest('tr').classList.toggle('opacity-30'); }
</script>
</body>
</html>
$TPL$
WHERE slug = 'session-command-hibrido';;
