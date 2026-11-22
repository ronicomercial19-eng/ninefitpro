UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>{{aluno_nome}} — Protocolo 9FIT</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
  :root {
    --bg: #0A0A0B; --surface: #131315; --surface2: #1C1C1F; --surface3: #242428;
    --orange: #E8571A; --orange-dim: rgba(232,87,26,0.15); --orange-border: rgba(232,87,26,0.3);
    --green: #2ECC71; --green-dim: rgba(46,204,113,0.12);
    --red: #E74C3C; --red-dim: rgba(231,76,60,0.12);
    --text: #F0F0F2; --text2: #A0A0A8; --text3: #606068;
    --border: rgba(255,255,255,0.06); --radius: 16px; --radius-sm: 10px;
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; overflow-x: hidden; }
  .header { background: linear-gradient(135deg, #0A0A0B 0%, #1a0d05 100%); padding: 40px 20px 24px; position: relative; overflow: hidden; border-bottom: 1px solid var(--border); }
  .header::before { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; background: radial-gradient(circle, rgba(232,87,26,0.2) 0%, transparent 70%); }
  .header-tag { display: inline-flex; align-items: center; gap: 6px; background: var(--orange-dim); border: 1px solid var(--orange-border); border-radius: 20px; padding: 4px 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--orange); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .header h1 { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; color: var(--text); }
  .header h1 span { color: var(--orange); }
  .header-sub { font-size: 13px; color: var(--text2); margin-top: 6px; }
  main { max-width: 480px; margin: 0 auto; padding: 20px 16px 60px; }
  .progress-bar { height: 4px; background: var(--surface3); border-radius: 2px; margin: 8px 0 20px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--orange); border-radius: 2px; width: 0%; transition: width .4s ease; }
  .phase-header { display: flex; align-items: center; gap: 12px; background: var(--surface2); border-radius: var(--radius-sm); padding: 14px; margin: 20px 0 10px; }
  .phase-badge { background: var(--orange); color: white; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .phase-name { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; }
  .exercise-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 8px; overflow: hidden; }
  .exercise-card.done { border-color: rgba(46,204,113,0.3); background: rgba(46,204,113,0.04); }
  .exercise-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
  .ex-num { width: 26px; height: 26px; background: var(--surface3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text2); flex-shrink: 0; }
  .exercise-card.done .ex-num { background: var(--green-dim); color: var(--green); }
  .ex-info { flex: 1; }
  .ex-name { font-size: 13px; font-weight: 600; }
  .ex-params { font-size: 11px; color: var(--orange); font-family: 'DM Mono', monospace; margin-top: 2px; }
  .exercise-detail { display: none; padding: 0 14px 14px; border-top: 1px solid var(--border); padding-top: 12px; }
  .exercise-detail.open { display: block; }
  .detail-note { font-size: 12px; color: var(--text2); line-height: 1.5; background: var(--surface2); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .btn-done { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; }
  .exercise-card.done .btn-done { background: var(--green-dim); border-color: rgba(46,204,113,0.3); color: var(--green); }
  .timer-widget { background: var(--surface2); border-radius: var(--radius-sm); padding: 16px; text-align: center; margin-top: 20px; }
  .timer-display { font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800; color: var(--orange); }
  .timer-btns { display: flex; gap: 8px; margin-top: 12px; }
  .timer-btn { flex: 1; background: var(--surface3); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; }
  .timer-btn.primary { background: var(--orange); border-color: var(--orange); color: white; }
</style>
</head>
<body>
<div class="header">
  <div class="header-tag">9FIT · PROTOCOLO ATIVO</div>
  <h1>{{aluno_nome}} <span>{{protocolo_nome}}</span></h1>
  <div class="header-sub">Fase: {{fase_nome}} · Semana {{semana_atual}}</div>
</div>
<main>
  <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
  <div id="progressInfo" style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;">0 de {{total_exercicios}} exercícios</div>

  {{#each blocos}}
  <div class="phase-header">
    <span class="phase-badge">{{this.label}}</span>
    <span class="phase-name">{{this.titulo}}</span>
  </div>
  {{#each this.exercicios}}
  <div class="exercise-card" id="ex{{this.idx}}">
    <div class="exercise-header" onclick="toggleEx({{this.idx}})">
      <div class="ex-num">{{this.ordem}}</div>
      <div class="ex-info">
        <div class="ex-name">{{this.nome}}</div>
        <div class="ex-params">{{this.series}}x{{this.reps}} · RPE {{this.rpe}} · {{this.descanso}}</div>
      </div>
    </div>
    <div class="exercise-detail" id="det{{this.idx}}">
      <div class="detail-note">{{this.nota_tecnica}}</div>
      <button class="btn-done" onclick="markDone({{this.idx}})">✓ Concluído</button>
    </div>
  </div>
  {{/each}}
  {{/each}}

  <div class="timer-widget">
    <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;">DESCANSO ENTRE SÉRIES</div>
    <div class="timer-display" id="timerDisplay">01:30</div>
    <div class="timer-btns">
      <button class="timer-btn" onclick="resetTimer()">Reset</button>
      <button class="timer-btn primary" id="timerBtn" onclick="startStopTimer()">Iniciar</button>
    </div>
  </div>
</main>
<script>
  let doneCount = 0;
  const total = {{total_exercicios}};
  function toggleEx(id) {
    const det = document.getElementById('det'+id);
    document.querySelectorAll('.exercise-detail').forEach(d => d.classList.remove('open'));
    det.classList.add('open');
  }
  function markDone(id) {
    const card = document.getElementById('ex'+id);
    if (!card.classList.contains('done')) { card.classList.add('done'); doneCount++; updateProgress(); }
  }
  function updateProgress() {
    const pct = Math.round((doneCount/total)*100);
    document.getElementById('progressFill').style.width = pct+'%';
    document.getElementById('progressInfo').textContent = doneCount+' de '+total+' exercícios';
  }
  let timerSecs = 90, timerRunning = false, timerInterval = null;
  function updateTimerDisplay() {
    const m = Math.floor(timerSecs/60), s = timerSecs%60;
    document.getElementById('timerDisplay').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function startStopTimer() {
    if (timerRunning) { clearInterval(timerInterval); timerRunning=false; document.getElementById('timerBtn').textContent='Retomar'; }
    else { timerRunning=true; document.getElementById('timerBtn').textContent='Pausar';
      timerInterval = setInterval(() => { if(timerSecs<=0){clearInterval(timerInterval);timerRunning=false;timerSecs=90;updateTimerDisplay();return;} timerSecs--; updateTimerDisplay(); },1000); }
  }
  function resetTimer() { clearInterval(timerInterval); timerRunning=false; timerSecs=90; document.getElementById('timerBtn').textContent='Iniciar'; updateTimerDisplay(); }
</script>
</body>
</html>
$TPL$
WHERE slug = 'dark-app-checklist';;
