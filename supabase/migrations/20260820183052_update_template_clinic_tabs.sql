UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{aluno_nome}} — Clinic</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;600;700&display=swap');
  :root { --cyan: #00D9FF; --bg: #060B0D; --card: #0D1518; --border: #1A2428; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background: var(--bg); color: #E8F4F6; font-family: 'Inter', sans-serif; }
  .brand { font-family: 'Syncopate', sans-serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  header { padding: 32px 20px 20px; border-bottom: 1px solid var(--border); }
  h1 { font-size: 22px; font-weight: 700; }
  h1 span { color: var(--cyan); }
  .tabs { display: flex; gap: 4px; padding: 12px 16px; overflow-x: auto; border-bottom: 1px solid var(--border); position: sticky; top:0; background: var(--bg); z-index: 10; }
  .tab { padding: 8px 16px; border-radius: 20px; font-size: 12px; border: 1px solid var(--border); color: #8AA; white-space: nowrap; cursor: pointer; }
  .tab.active { background: var(--cyan); color: #000; font-weight: 700; }
  .phase { display: none; padding: 20px 16px; }
  .phase.active { display: block; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 12px; }
  .ex-name { font-weight: 700; font-size: 14px; }
  .ex-meta { font-size: 11px; color: var(--cyan); font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
  .ex-note { font-size: 12px; color: #99B; margin-top: 8px; line-height: 1.5; }
  .pain-tracker { display: flex; gap: 6px; margin-top: 10px; }
  .pain-dot { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer; }
  .timer { text-align: center; padding: 20px; }
  .timer-val { font-family: 'Syncopate', sans-serif; font-size: 36px; color: var(--cyan); }
</style>
</head>
<body>
<header>
  <p class="mono" style="font-size:10px;color:var(--cyan);letter-spacing:2px;">9FIT · PROTOCOLO CLÍNICO</p>
  <h1>{{aluno_nome}} <span>{{condicao}}</span></h1>
  <p style="font-size:12px;color:#89A;margin-top:6px">{{fase_reabilitacao}}</p>
</header>
<div class="tabs" id="tabs">
  {{#each fases}}
  <div class="tab {{#if this.ativa}}active{{/if}}" onclick="showPhase('{{this.id}}')">{{this.nome}}</div>
  {{/each}}
</div>
{{#each fases}}
<div class="phase {{#if this.ativa}}active{{/if}}" id="phase-{{this.id}}">
  {{#each this.exercicios}}
  <div class="card">
    <div class="ex-name">{{this.nome}}</div>
    <div class="ex-meta">{{this.series}}x{{this.reps}} · {{this.descanso}}</div>
    <div class="ex-note">{{this.nota_tecnica}}</div>
    <div class="pain-tracker">
      <span style="font-size:11px;color:#789;margin-right:6px">Dor:</span>
      <div class="pain-dot" onclick="setPain(this,0)">0</div>
      <div class="pain-dot" onclick="setPain(this,3)">3</div>
      <div class="pain-dot" onclick="setPain(this,5)">5</div>
      <div class="pain-dot" onclick="setPain(this,7)">7+</div>
    </div>
  </div>
  {{/each}}
</div>
{{/each}}
<div class="timer">
  <div style="font-size:10px;color:#789;text-transform:uppercase;letter-spacing:2px;">Timer</div>
  <div class="timer-val" id="timerDisplay">00:60</div>
</div>
<script>
  function showPhase(id) {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('phase-'+id).classList.add('active');
    event.target.classList.add('active');
  }
  function setPain(el, val) {
    el.parentElement.querySelectorAll('.pain-dot').forEach(d => { d.style.background=''; d.style.borderColor='var(--border)'; });
    el.style.background = val >= 7 ? '#E74C3C' : val >= 5 ? '#F39C12' : val >= 3 ? '#3498DB' : '#2ECC71';
    el.style.borderColor = 'transparent';
  }
</script>
</body>
</html>
$TPL$
WHERE slug = 'clinic-tabs-reabilitacao';;
