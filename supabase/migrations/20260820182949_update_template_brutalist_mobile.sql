UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{aluno_nome}} — 9FIT</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; background:#fff; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .exercise-card { border: 2px solid #000; box-shadow: 4px 4px 0 #000; }
  .exercise-card.completed { background-color: #f1f5f9; opacity: 0.7; box-shadow: none; }
  .exercise-card.completed h3 { text-decoration: line-through; color: #94a3b8; }
  .tab-active { background: #E8571A; color: white !important; }
</style>
</head>
<body class="bg-white pb-12">
<header class="sticky top-0 z-50 bg-black text-white p-4 shadow-lg border-b-4 border-orange-500">
  <div class="flex justify-between items-center max-w-md mx-auto">
    <div>
      <h1 class="text-xl font-black italic tracking-tighter uppercase">9FIT · {{aluno_nome}}</h1>
      <p class="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{{fase_nome}}</p>
    </div>
  </div>
</header>
<main class="max-w-md mx-auto p-4 space-y-4">
  <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar" id="workout-selector">
    {{#each treinos}}
    <button onclick="selectWorkout('{{this.letra}}')" class="workout-btn flex-none w-16 h-16 border-2 border-black font-black text-xl flex items-center justify-center {{#if this.ativo}}bg-orange-500 text-white{{else}}bg-white text-black{{/if}}" id="btn-{{this.letra}}">{{this.letra}}</button>
    {{/each}}
  </div>
  <div class="flex items-center gap-2 mb-2 px-1">
    <div class="w-1 h-6 bg-orange-500"></div>
    <h2 id="workout-title" class="text-lg font-black uppercase italic">{{treino_titulo_inicial}}</h2>
  </div>
  <div id="exercises-container" class="space-y-3"></div>
</main>
<script>
  const workouts = {{treinos_json}};
  let currentWorkout = Object.keys(workouts)[0];
  function selectWorkout(type) {
    currentWorkout = type;
    document.querySelectorAll('.workout-btn').forEach(btn => { btn.classList.remove('bg-orange-500','text-white'); btn.classList.add('bg-white','text-black'); });
    document.getElementById('btn-'+type).classList.add('bg-orange-500','text-white');
    renderExercises();
  }
  function renderExercises() {
    const container = document.getElementById('exercises-container');
    const title = document.getElementById('workout-title');
    const data = workouts[currentWorkout];
    title.innerText = data.title;
    container.innerHTML = '';
    data.exercises.forEach((ex, index) => {
      const div = document.createElement('div');
      div.className = 'exercise-card relative overflow-hidden rounded-none bg-white p-4 active:scale-[0.98] transition-all';
      div.onclick = () => div.classList.toggle('completed');
      div.innerHTML = `<div class="flex justify-between items-start">
        <div class="flex-1">
          <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">${ex.g}</span>
          <h3 class="text-base font-bold mt-1 text-slate-800">${ex.e}</h3>
          <div class="flex items-center gap-2 mt-2 text-slate-500"><p class="text-[10px] font-medium leading-tight">${ex.obs}</p></div>
        </div>
        <div class="text-right ml-4"><div class="text-lg font-black text-black">${ex.r}</div><span class="text-[8px] font-bold text-slate-400 uppercase">Séries/Reps</span></div>
      </div>`;
      container.appendChild(div);
    });
  }
  window.onload = renderExercises;
</script>
</body>
</html>
$TPL$
WHERE slug = 'brutalist-mobile';;
