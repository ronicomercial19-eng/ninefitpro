UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{aluno_nome}} — Estratégia de Corrida</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  body { font-family: 'Inter', sans-serif; background:#F8FAFC; }
  .accent { color: #E8571A; }
</style>
</head>
<body class="text-slate-800">
<header class="bg-black text-white p-6">
  <div class="max-w-4xl mx-auto">
    <p class="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">9FIT · Estratégia de Corrida</p>
    <h1 class="text-2xl font-black">{{aluno_nome}} — {{objetivo_prova}}</h1>
    <p class="text-sm text-zinc-400 mt-1">{{data_prova}} · Ritmo alvo: {{ritmo_alvo}}</p>
  </div>
</header>
<main class="max-w-4xl mx-auto p-6 space-y-8">
  <section>
    <h2 class="text-lg font-black uppercase mb-3">Evolução de Ritmo</h2>
    <div class="bg-white rounded-2xl shadow p-4"><canvas id="paceChart" height="100"></canvas></div>
  </section>
  <section>
    <h2 class="text-lg font-black uppercase mb-3">Planejamento Semanal</h2>
    <div class="overflow-x-auto bg-white rounded-2xl shadow">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-100 text-[11px] uppercase text-slate-500">
          <tr><th class="p-4">Dia</th><th class="p-4">Tipo</th><th class="p-4">Distância/Duração</th><th class="p-4">Ritmo</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
        {{#each plano_semanal}}
          <tr>
            <td class="p-4 font-bold">{{this.dia}}</td>
            <td class="p-4"><span class="accent font-semibold">{{this.tipo}}</span></td>
            <td class="p-4">{{this.distancia}}</td>
            <td class="p-4 font-mono">{{this.ritmo}}</td>
          </tr>
        {{/each}}
        </tbody>
      </table>
    </div>
  </section>
  <section>
    <h2 class="text-lg font-black uppercase mb-3">Notas Técnicas</h2>
    <div class="bg-white rounded-2xl shadow p-6 space-y-3">
      {{#each notas_tecnicas}}
      <div class="flex gap-3"><span class="text-orange-500">●</span><p class="text-sm text-slate-600">{{this}}</p></div>
      {{/each}}
    </div>
  </section>
</main>
<script>
  new Chart(document.getElementById('paceChart'), {
    type: 'line',
    data: {
      labels: {{grafico_labels}},
      datasets: [{ label: 'Ritmo (min/km)', data: {{grafico_valores}}, borderColor: '#E8571A', backgroundColor: 'rgba(232,87,26,0.1)', tension: 0.3, fill: true }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
</script>
</body>
</html>
$TPL$
WHERE slug = 'dashboard-corrida-chart';;
