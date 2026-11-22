UPDATE training_html_templates
SET html_template = $TPL$<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{{aluno_nome}} — Guia 9FIT</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap');
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 20px; }
  h1 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; }
  .accent { color: #E8571A; }
  .header { border-bottom: 3px solid #E8571A; padding-bottom: 16px; margin-bottom: 24px; display:flex; justify-content:space-between; align-items:flex-end; }
  .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .block { border: 1px solid #E5E5E5; border-radius: 12px; padding: 16px; page-break-inside: avoid; }
  .block-num { display:inline-block; width:24px; height:24px; background:#E8571A; color:white; border-radius:50%; text-align:center; line-height:24px; font-size:12px; font-weight:700; margin-right:8px; }
  .block-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; display:inline; }
  .ex-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F0F0F0; font-size:12px; }
  .ex-row:last-child { border-bottom:none; }
  @media print { .no-print { display:none; } }
  .print-btn { background:#E8571A; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:700; margin-bottom:20px; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
<div class="header">
  <div>
    <h1>{{aluno_nome}}</h1>
    <p class="subtitle">{{protocolo_nome}} · {{fase_nome}} · Semana {{semana_atual}}</p>
  </div>
  <p class="accent" style="font-family:'Syne',sans-serif;font-weight:800;font-size:14px;">9FIT</p>
</div>
<div class="grid">
  {{#each blocos_numerados}}
  <div class="block">
    <div><span class="block-num">{{this.numero}}</span><span class="block-title">{{this.titulo}}</span></div>
    {{#each this.exercicios}}
    <div class="ex-row"><span>{{this.nome}}</span><span style="font-weight:600">{{this.series}}x{{this.reps}}</span></div>
    {{/each}}
  </div>
  {{/each}}
</div>
<div class="block" style="margin-bottom:24px;">
  <div class="block-title" style="margin-bottom:12px;display:block;">Resumo do Ciclo</div>
  <p style="font-size:12px;color:#555;line-height:1.6;">{{resumo_ciclo}}</p>
</div>
</body>
</html>
$TPL$
WHERE slug = 'guia-pdf-a4';;
