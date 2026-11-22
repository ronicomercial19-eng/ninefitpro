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
    --yellow: #F39C12; --yellow-dim: rgba(243,156,18,0.12);
    --blue: #3498DB; --blue-dim: rgba(52,152,219,0.12);
    --purple: #9B59B6; --purple-dim: rgba(155,89,182,0.12);
    --text: #F0F0F2; --text2: #A0A0A8; --text3: #606068;
    --border: rgba(255,255,255,0.06); --radius: 16px; --radius-sm: 10px;
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; overflow-x: hidden; }
  .header { background: linear-gradient(135deg, #0A0A0B 0%, #1a0d05 100%); padding: 48px 20px 28px; position: relative; overflow: hidden; border-bottom: 1px solid var(--border); }
  .header::before { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; background: radial-gradient(circle, rgba(232,87,26,0.2) 0%, transparent 70%); pointer-events:none; }
  .header-tag { display: inline-flex; align-items: center; gap: 6px; background: var(--orange-dim); border: 1px solid var(--orange-border); border-radius: 20px; padding: 4px 12px; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--orange); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .header-tag::before { content:'●'; font-size:6px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .header h1 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; line-height: 1.1; }
  .header h1 span { color: var(--orange); }
  .header-sub { font-size: 13px; color: var(--text2); margin-top: 6px; font-weight: 300; }
  .header-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
  .chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: var(--text2); font-family: 'DM Mono', monospace; }
  .chip.red { background: var(--red-dim); border-color: rgba(231,76,60,0.3); color: var(--red); }
  .chip.orange { background: var(--orange-dim); border-color: var(--orange-border); color: var(--orange); }
  .chip.green { background: var(--green-dim); border-color: rgba(46,204,113,0.3); color: var(--green); }
  .nav { display: flex; overflow-x: auto; gap: 4px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; scrollbar-width: none; }
  .nav::-webkit-scrollbar { display:none; }
  .nav-btn { flex-shrink: 0; background: transparent; border: 1px solid var(--border); border-radius: 20px; padding: 7px 14px; color: var(--text2); font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
  .nav-btn.active { background: var(--orange); border-color: var(--orange); color: white; font-weight: 600; }
  .section { display: none; padding: 20px 16px 40px; }
  .section.active { display: block; animation: fadeIn .3s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .section-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .section-desc { font-size: 13px; color: var(--text2); margin-bottom: 20px; line-height: 1.5; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }
  .card.orange-accent { border-left: 3px solid var(--orange); }
  .card.red-accent { border-left: 3px solid var(--red); }
  .card.green-accent { border-left: 3px solid var(--green); }
  .card.blue-accent { border-left: 3px solid var(--blue); }
  .card.purple-accent { border-left: 3px solid var(--purple); }
  .card-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .card-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .check-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .check-item:last-child { border-bottom: none; padding-bottom: 0; }
  .check-box { width: 22px; height: 22px; border: 2px solid var(--text3); border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
  .check-item.checked .check-box { background: var(--green); border-color: var(--green); }
  .check-item.checked .check-box::after { content:'✓'; color:white; font-size:13px; font-weight:700; }
  .check-item.critical .check-box { border-color: var(--red); }
  .check-item.critical.checked .check-box { background: var(--red); border-color: var(--red); }
  .check-label { font-size: 13px; font-weight: 500; }
  .check-sub { font-size: 11px; color: var(--text2); margin-top: 2px; line-height: 1.4; }
  .check-item.checked .check-label { text-decoration: line-through; color: var(--text3); }
  .phase-header { display: flex; align-items: center; gap: 12px; background: var(--surface2); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px; }
  .phase-badge { background: var(--orange); color: white; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; padding: 4px 8px; border-radius: 6px; flex-shrink: 0; text-transform: uppercase; }
  .phase-name { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; }
  .phase-dur { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .exercise-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 8px; overflow: hidden; }
  .exercise-card.done { border-color: rgba(46,204,113,0.3); background: rgba(46,204,113,0.04); }
  .exercise-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
  .ex-num { width: 26px; height: 26px; background: var(--surface3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text2); flex-shrink: 0; }
  .exercise-card.done .ex-num { background: var(--green-dim); color: var(--green); }
  .ex-name { font-size: 13px; font-weight: 600; }
  .ex-params { font-size: 11px; color: var(--orange); font-family: 'DM Mono', monospace; margin-top: 2px; }
  .exercise-detail { display: none; padding: 0 14px 14px; border-top: 1px solid var(--border); padding-top: 12px; }
  .exercise-detail.open { display: block; }
  .detail-note { font-size: 12px; color: var(--text2); line-height: 1.5; background: var(--surface2); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .detail-alert { font-size: 12px; color: var(--red); line-height: 1.5; background: var(--red-dim); border-radius: 8px; padding: 10px; margin-bottom: 8px; border: 1px solid rgba(231,76,60,0.2); }
  .btn-done { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; }
  .exercise-card.done .btn-done { background: var(--green-dim); border-color: rgba(46,204,113,0.3); color: var(--green); }
  .nutrient-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .nutrient-row:last-child { border-bottom: none; }
  .nutrient-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; background: var(--orange-dim); }
  .nutrient-name { font-size: 13px; font-weight: 600; }
  .nutrient-dose { font-size: 11px; color: var(--text2); margin-top: 1px; }
  .day-timeline { position: relative; padding-left: 20px; }
  .day-timeline::before { content:''; position: absolute; left: 6px; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, var(--orange), var(--surface3)); }
  .timeline-item { position: relative; padding: 0 0 16px 20px; }
  .timeline-item::before { content:''; position: absolute; left: -17px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--surface3); border: 2px solid var(--text3); }
  .timeline-item.highlight::before { border-color: var(--orange); background: var(--orange); }
  .timeline-time { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--orange); text-transform: uppercase; }
  .timeline-title { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .timeline-desc { font-size: 12px; color: var(--text2); margin-top: 3px; line-height: 1.4; }
  .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0 12px; }
  .divider-line { flex: 1; height: 1px; background: var(--border); }
  .divider-text { font-size: 10px; color: var(--text3); font-family: 'DM Mono', monospace; text-transform: uppercase; white-space: nowrap; }
  .emergency-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .emergency-item:last-child { border-bottom: none; }
  .em-bullet { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; margin-top: 5px; }
  .em-text { font-size: 13px; line-height: 1.4; }
  .em-sub { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .alert-box { border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px; display: flex; gap: 12px; align-items: flex-start; }
  .alert-box.danger { background: var(--red-dim); border: 1px solid rgba(231,76,60,0.25); }
  .alert-box.warning { background: var(--yellow-dim); border: 1px solid rgba(243,156,18,0.25); }
  .alert-box.success { background: var(--green-dim); border: 1px solid rgba(46,204,113,0.25); }
  .alert-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .alert-box.danger .alert-title { color: var(--red); }
  .alert-box.warning .alert-title { color: var(--yellow); }
  .alert-box.success .alert-title { color: var(--green); }
  .alert-text { font-size: 12px; color: var(--text2); line-height: 1.5; }
  .pa-status { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 10px; }
  .pa-status.ok { background: var(--green-dim); color: var(--green); }
  .pa-status.warn { background: var(--yellow-dim); color: var(--yellow); }
  .pa-status.stop { background: var(--red-dim); color: var(--red); }
  .pa-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .pa-input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: var(--text); font-size: 18px; font-family: 'Syne', sans-serif; font-weight: 700; text-align: center; outline: none; }
  .pa-sep { display: flex; align-items: center; color: var(--text3); font-size: 20px; font-weight: 700; }
  .btn-verify { width: 100%; background: var(--orange); border: none; border-radius: 12px; padding: 14px; color: white; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; }
  .bottom-safe { height: 30px; }
</style>
</head>
<body>
<div class="header">
  <div class="header-tag">9FIT · PROTOCOLO ATIVO</div>
  <h1>{{aluno_nome}} <span>{{condicao_principal}}</span></h1>
  <div class="header-sub">{{contexto_clinico}}</div>
  <div class="header-chips">
    {{#each condicoes}}<span class="chip {{this.tipo}}">{{this.texto}}</span>{{/each}}
  </div>
</div>

<nav class="nav" id="navBar">
  <button class="nav-btn active" onclick="showSection('antes')">Pré-Treino</button>
  <button class="nav-btn" onclick="showSection('treino')">Treino</button>
  <button class="nav-btn" onclick="showSection('durante')">Monitorar</button>
  <button class="nav-btn" onclick="showSection('nutricao')">Nutrição</button>
  <button class="nav-btn" onclick="showSection('emergencia')">🚨 Emergência</button>
</nav>

<section class="section active" id="antes">
  <div class="section-title">Antes de Treinar</div>
  <div class="section-desc">Execute todos os itens do checklist antes de iniciar.</div>

  {{#if monitorar_pa}}
  <div class="card orange-accent">
    <div class="card-title"><div class="card-icon">❤️</div>Verificar Pressão Arterial</div>
    <div class="pa-input-row">
      <input class="pa-input" type="number" id="paS" placeholder="SIS" inputmode="numeric">
      <div class="pa-sep">/</div>
      <input class="pa-input" type="number" id="paD" placeholder="DIA" inputmode="numeric">
    </div>
    <button class="btn-verify" onclick="checkPA()">Verificar PA</button>
    <div id="paResult" style="display:none;"></div>
  </div>
  {{/if}}

  <div class="card green-accent">
    <div class="card-title"><div class="card-icon">✅</div>Checklist Obrigatório</div>
    {{#each checklist_pre_treino}}
    <div class="check-item {{this.criticidade}}" onclick="toggleCheck(this)">
      <div class="check-box"></div>
      <div class="check-text">
        <div class="check-label">{{this.pergunta}}</div>
        <div class="check-sub">{{this.explicacao}}</div>
      </div>
    </div>
    {{/each}}
  </div>

  {{#if contraindicacoes}}
  <div class="card red-accent">
    <div class="card-title"><div class="card-icon">🚫</div>Nunca Fazer</div>
    {{#each contraindicacoes}}
    <div class="detail-alert">{{this}}</div>
    {{/each}}
  </div>
  {{/if}}
</section>

<section class="section" id="treino">
  <div class="section-title">Treino de Hoje</div>
  <div class="section-desc">{{protocolo_nome}} — {{fase_nome}}, semana {{semana_atual}}</div>

  {{#each blocos}}
  <div class="phase-header">
    <span class="phase-badge">{{this.label}}</span>
    <div>
      <div class="phase-name">{{this.titulo}}</div>
      <div class="phase-dur">⏱ {{this.duracao}}</div>
    </div>
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
      {{#if this.alerta}}<div class="detail-alert">{{this.alerta}}</div>{{/if}}
      <button class="btn-done" onclick="markDone({{this.idx}})">✓ Concluído</button>
    </div>
  </div>
  {{/each}}
  {{/each}}
</section>

<section class="section" id="durante">
  <div class="section-title">Monitoramento</div>
  <div class="section-desc">Parâmetros a observar durante o treino.</div>

  <div class="card green-accent">
    <div class="card-title"><div class="card-icon">🗣️</div>Teste da Fala</div>
    <div class="alert-box success"><div class="alert-content"><div class="alert-title">Consegue falar frase inteira?</div><div class="alert-text">Intensidade OK — continue.</div></div></div>
    <div class="alert-box warning"><div class="alert-content"><div class="alert-title">Só palavras curtas?</div><div class="alert-text">Reduza intensidade imediatamente.</div></div></div>
    <div class="alert-box danger"><div class="alert-content"><div class="alert-title">Sem fôlego?</div><div class="alert-text">PARE. Descanse 5 min. Se não melhorar, contate o professor.</div></div></div>
  </div>

  {{#if sinais_alerta}}
  <div class="card red-accent">
    <div class="card-title"><div class="card-icon">🚨</div>Pare Imediatamente se...</div>
    {{#each sinais_alerta}}
    <div class="emergency-item"><div class="em-bullet"></div><div><div class="em-text">{{this.sinal}}</div><div class="em-sub">{{this.acao}}</div></div></div>
    {{/each}}
  </div>
  {{/if}}
</section>

<section class="section" id="nutricao">
  <div class="section-title">Suporte Completo</div>
  <div class="section-desc">Nutrição, suplementação e rotina do dia.</div>

  {{#if suplementos}}
  <div class="divider"><div class="divider-line"></div><div class="divider-text">Suplementação</div><div class="divider-line"></div></div>
  <div class="card orange-accent">
    <div class="card-title"><div class="card-icon">💊</div>Suplementos Prescritos</div>
    {{#each suplementos}}
    <div class="nutrient-row">
      <div class="nutrient-icon">💊</div>
      <div class="nutrient-info"><div class="nutrient-name">{{this.nome}}</div><div class="nutrient-dose">{{this.dose}}</div></div>
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if rotina_dia}}
  <div class="divider"><div class="divider-line"></div><div class="divider-text">Rotina Diária</div><div class="divider-line"></div></div>
  <div class="card blue-accent">
    <div class="card-title"><div class="card-icon">📅</div>Estrutura do Dia</div>
    <div class="day-timeline">
      {{#each rotina_dia}}
      <div class="timeline-item {{this.destaque}}">
        <div class="timeline-time">{{this.hora}}</div>
        <div class="timeline-title">{{this.titulo}}</div>
        <div class="timeline-desc">{{this.descricao}}</div>
      </div>
      {{/each}}
    </div>
  </div>
  {{/if}}
</section>

<section class="section" id="emergencia">
  <div class="section-title">🚨 Protocolo de Emergência</div>
  <div class="section-desc">Em caso de dúvida, sempre considere emergência e aja imediatamente.</div>

  {{#each protocolo_emergencia}}
  <div class="card red-accent">
    <div class="card-title" style="color:var(--red)">{{this.categoria}}</div>
    {{#each this.itens}}
    <div class="emergency-item"><div class="em-bullet"></div><div><div class="em-text">{{this.sinal}}</div><div class="em-sub">{{this.acao}}</div></div></div>
    {{/each}}
  </div>
  {{/each}}

  <div class="card" style="background:var(--surface2); border-color:var(--orange-border)">
    <div class="card-title"><div class="card-icon">👨‍💼</div>Contato do Professor</div>
    <div class="detail-note" style="text-align:center">Qualquer dúvida — contate {{professor_nome}} antes de decidir sozinho(a).</div>
  </div>
  <div class="bottom-safe"></div>
</section>

<script>
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const map = {antes:0,treino:1,durante:2,nutricao:3,emergencia:4};
  document.querySelectorAll('.nav-btn')[map[id]].classList.add('active');
  window.scrollTo(0,0);
}
function checkPA() {
  const s = parseInt(document.getElementById('paS').value), d = parseInt(document.getElementById('paD').value);
  const res = document.getElementById('paResult');
  if (!s || !d) { res.style.display='none'; return; }
  res.style.display='block';
  if (s >= 160 || d >= 110) { res.className='pa-status stop'; res.innerHTML='🛑 PA MUITO ALTA — NÃO TREINAR. '+s+'/'+d; }
  else if (s >= 140 || d >= 90) { res.className='pa-status warn'; res.innerHTML='⚠️ PA ELEVADA — Reavalie em 30min. '+s+'/'+d; }
  else if (s < 90 || d < 50) { res.className='pa-status warn'; res.innerHTML='⚠️ PA BAIXA — Hidrate-se. '+s+'/'+d; }
  else { res.className='pa-status ok'; res.innerHTML='✅ PA NORMAL. '+s+'/'+d; }
}
function toggleCheck(el) { el.classList.toggle('checked'); }
function toggleEx(id) {
  const det = document.getElementById('det'+id);
  document.querySelectorAll('.exercise-detail').forEach(d => d.classList.remove('open'));
  det.classList.add('open');
}
function markDone(id) { document.getElementById('ex'+id).classList.add('done'); }
</script>
</body>
</html>
$TPL$
WHERE slug = 'protocolo-clinico-completo';;
