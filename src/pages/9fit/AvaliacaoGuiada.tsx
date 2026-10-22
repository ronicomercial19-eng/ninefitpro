import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useActivationFlow } from '@/hooks/useActivationFlow';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { RepCounter, TestTimer } from '@/components/9fit/TestTimer';
import { toast } from 'sonner';
import {
  CONDITIONS, LEVEL_INFO, MEASURES, SCREENING, TESTS_BY_LEVEL,
  brzycki1RM, imc, imcFaixa, navyBodyFat, parseNum, rce, rcq, rcqAtencao,
  type Field, type Level, type Sexo,
} from '@/lib/guidedAssessment';
import { computeConfidence, isReliable, resolveMeasure, tolerance, type Resolved } from '@/lib/guidedReliability';

const STEPS = ['Começar', 'Saúde', 'Medidas', 'Testes', 'Resultado'] as const;

/** Ferramentas por teste: cronômetro e contador de repetições (reduzem o erro de medir sozinho). */
const TOOLS: Record<string, { timer?: { mode: 'countdown' | 'stopwatch'; seconds?: number; perField?: boolean }; counter?: boolean }> = {
  fc_repouso: { timer: { mode: 'countdown', seconds: 60 } },
  sentar_levantar_30s: { timer: { mode: 'countdown', seconds: 30 }, counter: true },
  prancha: { timer: { mode: 'stopwatch' } },
  flexao: { counter: true },
  agachamento: { timer: { mode: 'countdown', seconds: 60 }, counter: true },
  prancha_lateral: { timer: { mode: 'stopwatch', perField: true } },
  barra: { counter: true },
};

function FieldInput({ f, value, onChange, labelOverride }: { f: Field; value: string; onChange: (v: string) => void; labelOverride?: string }) {
  const label = labelOverride || f.label;
  const n = parseNum(value);
  const bad = value.trim() !== '' && (n === null || n < f.min || n > f.max);
  return (
    <label className="block text-sm">
      <span className="text-foreground">{label}{f.optional && !labelOverride ? <span className="text-muted-foreground"> (opcional)</span> : null}</span>
      <div className="mt-1 flex items-center gap-2">
        <input aria-label={label} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className={`block w-full rounded-xl border bg-card p-3 ${bad ? 'border-destructive' : 'border-border'}`} />
        <span className="text-xs text-muted-foreground w-10">{f.unit}</span>
      </div>
      {bad && <span className="text-xs text-destructive">Fora do esperado ({f.min} a {f.max} {f.unit}). Confira.</span>}
    </label>
  );
}

function statusText(r: Resolved, unit: string, tol: number): { text: string; tone: 'ok' | 'warn' | 'info' } | null {
  if (r.status === 'none') return null;
  if (r.status === 'single') return { text: 'Meça uma segunda vez para confirmar.', tone: 'info' };
  if (r.status === 'ok') return { text: `Leituras concordantes (diferença ${r.diff} ${unit}). Usaremos ${r.value} ${unit}.`, tone: 'ok' };
  if (r.status === 'discordant') return { text: `Diferença de ${r.diff} ${unit} (máximo ${tol}). Meça uma 3ª vez abaixo.`, tone: 'warn' };
  return { text: `Usaremos a mediana das 3 leituras: ${r.value} ${unit}.`, tone: 'ok' };
}

export default function NineFitAvaliacaoGuiada() {
  const { athleteId } = useAthleteId();
  const { advanceStep } = useActivationFlow();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level>('iniciante');
  const [sexo, setSexo] = useState<Sexo>(null);
  const [screen, setScreen] = useState<Record<string, boolean>>({});
  const [feelsWell, setFeelsWell] = useState(false);
  const [cond, setCond] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [variation, setVariation] = useState<Record<string, string>>({});
  const [timerUsed, setTimerUsed] = useState<Record<string, boolean>>({});
  const [updateProfile, setUpdateProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goal, setGoal] = useState('Saúde e Bem-estar');
  const [frequency, setFrequency] = useState(3);
  const [restrictions, setRestrictions] = useState('');

  const set = (k: string) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const restricted = SCREENING.some((q) => screen[q.id]);
  const testsAllowed = !restricted && feelsWell;
  const tests = TESTS_BY_LEVEL[level];

  /** Cada medida pode ter até 3 leituras (chaves key__1, key__2, key__3). */
  const res = useMemo(() => {
    const out: Record<string, Resolved> = {};
    for (const f of MEASURES) out[f.key] = resolveMeasure([values[`${f.key}__1`], values[`${f.key}__2`], values[`${f.key}__3`]], tolerance(f.key));
    return out;
  }, [values]);

  const r = useMemo(() => {
    const n = (k: string) => parseNum(values[k]);
    const peso = res.peso.value, altura = res.altura.value, cintura = res.circunferencia_cintura.value, quadril = res.circunferencia_quadril.value, pescoco = res.circunferencia_pescoco.value;
    const bf = navyBodyFat(sexo, altura, cintura, pescoco, quadril);
    const rm = (p: string) => brzycki1RM(n(`${p}_carga`), n(`${p}_reps`));
    const done = tests.reduce((a, t) => a + (t.fields.some((f) => n(f.key) !== null) ? 1 : 0), 0);
    const timed = tests.filter((t) => TOOLS[t.id]?.timer || TOOLS[t.id]?.counter);
    const timedDone = timed.filter((t) => t.fields.some((f) => n(f.key) !== null) && timerUsed[t.id]).length;
    const coreReliable = [res.peso, res.altura, res.circunferencia_cintura].filter(isReliable).length;
    const conf = computeConfidence({
      conditionsChecked: CONDITIONS.filter((c) => cond[c.id]).length, conditionsTotal: CONDITIONS.length,
      coreReliable, bodyFatAvailable: bf !== null, testsAllowed, testsDone: done, testsTotal: tests.length,
      timerTests: timedDone, timedTestsTotal: timed.filter((t) => t.fields.some((f) => n(f.key) !== null)).length,
    });
    return {
      peso, altura, bf, imc: imc(peso, altura), rce: rce(cintura, altura), rcq: rcq(cintura, quadril),
      rm: { sup: rm('rm_supino'), agach: rm('rm_agachamento'), pux: rm('rm_puxada') }, done, conf,
    };
  }, [values, res, sexo, cond, tests, testsAllowed, timerUsed]);

  function validateStep(): string | null {
    if (step === 1 && !SCREENING.every((q) => q.id in screen)) return 'Responda todas as perguntas de saúde.';
    if (step === 2) {
      for (const k of ['peso', 'altura']) if (res[k].value === null) return 'Informe peso e altura para continuar.';
      for (const f of MEASURES) {
        for (const i of [1, 2, 3]) {
          const raw = values[`${f.key}__${i}`];
          if (raw && raw.trim() !== '') {
            const v = parseNum(raw);
            if (v === null || v < f.min || v > f.max) return `Confira a medida: ${f.label}.`;
          }
        }
        if (res[f.key].status === 'discordant') return `${f.label}: as duas leituras divergem. Faça uma 3ª medida.`;
      }
    }
    if (step === 3 && testsAllowed) {
      for (const t of tests) for (const f of t.fields) {
        const raw = values[f.key];
        if (raw && raw.trim() !== '') {
          const v = parseNum(raw);
          if (v === null || v < f.min || v > f.max) return `Confira o valor: ${t.title} — ${f.label}.`;
        }
      }
    }
    return null;
  }

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function save() {
    if (!athleteId || saving) return;
    const n = (k: string) => parseNum(values[k]);
    const data: Record<string, number | string | object> = {};
    const put = (key: string, v: number | null) => { if (v !== null) data[key] = v; };
    for (const f of MEASURES) put(f.key, res[f.key].value);
    if (r.bf !== null) { data.gordura_corporal = r.bf; data.metodo_gordura = 'us_navy_estimativa'; }
    if (testsAllowed) {
      for (const t of tests) for (const f of t.fields) if (!f.key.startsWith('rm_')) put(f.key, n(f.key));
      put('rm1_empurrar_superior', r.rm.sup); put('rm1_empurrar_perna', r.rm.agach); put('rm1_puxar_costas', r.rm.pux);
    }
    if (Object.keys(data).filter((k) => typeof data[k] === 'number').length === 0) return toast.error('Informe ao menos uma medida.');
    data.nivel = level;
    data.confianca = `${r.conf.label} (${r.conf.points}/${r.conf.max})`;
    data.triagem = { restrito: restricted, sentindo_bem_hoje: feelsWell, respostas_sim: SCREENING.filter((q) => screen[q.id]).map((q) => q.id) };
    const leituras: Record<string, { leituras: number[]; status: string }> = {};
    for (const f of MEASURES) if (res[f.key].status !== 'none') leituras[f.key] = { leituras: res[f.key].readings, status: res[f.key].status };
    data.condicoes = { ...cond, flexao_variacao: variation.flexao_variacao || null, leituras, cronometro_app: Object.keys(timerUsed).filter((k) => timerUsed[k]) };

    setSaving(true);
    try {
      const { data: out, error } = await supabase.rpc('fn_salvar_avaliacao_guiada_v2' as any, {
        p_athlete_id: athleteId, p_data: data, p_atualizar_perfil: updateProfile, p_data_avaliacao: format(new Date(), 'yyyy-MM-dd'),
      });
      if (error || !(out as any)?.success) throw error || new Error('A avaliação não foi salva');
      window.dispatchEvent(new Event('9fit:sync_updated'));
      window.dispatchEvent(new Event('9fit:profile-updated'));
      if (params.get('returnTo') === 'progresso') {
        toast.success('Avaliação salva no seu histórico');
        navigate('/9fit/progresso/historico');
        return;
      }
      const advanced = await advanceStep('assessment', { goal, experience_level: LEVEL_INFO[level].label, weekly_frequency: frequency, restrictions });
      if (!advanced) { toast.error('Avaliação salva. Revise a conexão para finalizar a ficha de treino.'); return; }
      toast.success('Avaliação salva e perfil de treino atualizado');
      navigate('/9fit/ativacao');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar a avaliação');
    } finally { setSaving(false); }
  }

  const card = 'rounded-2xl border border-border bg-card/60 p-4 space-y-3';
  const btn = 'w-full rounded-xl p-3 font-bold disabled:opacity-50';

  return (
    <main className="min-h-screen bg-background p-4 pb-28">
      <div className="max-w-lg mx-auto space-y-4">
        <header>
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">Avaliação guiada · passo {step + 1} de {STEPS.length}</p>
          <h1 className="text-2xl font-bold">{STEPS[step]}</h1>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full orange-satin transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Você faz tudo sozinho, com passo a passo, cronômetro e medidas conferidas em duplicata para o resultado ser confiável. Leva de 15 a 25 minutos. Não substitui consulta médica.</p>
            <div className={card}>
              <p className="font-semibold">Qual é o seu nível?</p>
              {(Object.keys(LEVEL_INFO) as Level[]).map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)}
                  className={`w-full text-left rounded-xl border p-3 transition ${level === l ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <span className="font-semibold">{LEVEL_INFO[l].label}</span>
                  <span className="block text-xs text-muted-foreground">{LEVEL_INFO[l].desc}</span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground">Na dúvida, escolha Iniciante. Você pode refazer em outro nível depois.</p>
            </div>
            <div className={card}>
              <p className="font-semibold">Sexo biológico <span className="text-xs font-normal text-muted-foreground">(só para a estimativa de gordura corporal)</span></p>
              <div className="flex gap-2">
                {([['F', 'Feminino'], ['M', 'Masculino'], [null, 'Prefiro não informar']] as [Sexo, string][]).map(([v, l]) => (
                  <button key={l} type="button" onClick={() => setSexo(v)}
                    className={`flex-1 rounded-xl border p-2 text-xs ${sexo === v ? 'border-primary bg-primary/10' : 'border-border'}`}>{l}</button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Essa resposta não fica salva. Ela só entra na conta da estimativa.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Antes de qualquer teste de esforço, precisamos saber se é seguro para você.</p>
            <div className={card}>
              {SCREENING.map((q) => (
                <div key={q.id} className="space-y-1">
                  <p className="text-sm">{q.text}</p>
                  <div className="flex gap-2">
                    {[['Não', false], ['Sim', true]].map(([l, v]) => (
                      <button key={String(l)} type="button" onClick={() => setScreen((s) => ({ ...s, [q.id]: v as boolean }))}
                        className={`flex-1 rounded-lg border p-2 text-sm ${screen[q.id] === v ? 'border-primary bg-primary/10' : 'border-border'}`}>{l as string}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {restricted && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Você respondeu "sim" a pelo menos uma pergunta. Vamos registrar apenas as <b>medidas corporais</b> e pular os testes de esforço. Procure avaliação médica antes de fazer testes físicos.
              </div>
            )}
            {!restricted && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={feelsWell} onChange={(e) => setFeelsWell(e.target.checked)} className="mt-1" />
                <span>Hoje estou bem: sem febre, dor ou mal-estar, e descansado. Se não estiver, deixe desmarcado: vamos registrar só as medidas.</span>
              </label>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Meça cada item <b>duas vezes</b>. Se as leituras divergirem além da tolerância, pediremos uma terceira e usaremos a mediana. É assim que se mede com precisão.</p>
            <div className={card}>
              {MEASURES.map((f) => {
                const tol = tolerance(f.key);
                const st = statusText(res[f.key], f.unit, tol);
                const showThird = res[f.key].status === 'discordant' || res[f.key].status === 'median3';
                return (
                  <div key={f.key} className="space-y-2 pb-3 border-b border-border/50 last:border-0">
                    <p className="text-sm font-semibold">{f.label}{f.optional ? <span className="text-muted-foreground font-normal"> (opcional)</span> : null}</p>
                    <p className="text-[11px] text-muted-foreground">{f.how}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FieldInput f={{ ...f, optional: false }} labelOverride="1ª medida" value={values[`${f.key}__1`] || ''} onChange={set(`${f.key}__1`)} />
                      <FieldInput f={{ ...f, optional: false }} labelOverride="2ª medida" value={values[`${f.key}__2`] || ''} onChange={set(`${f.key}__2`)} />
                    </div>
                    {showThird && <FieldInput f={{ ...f, optional: false }} labelOverride="3ª medida" value={values[`${f.key}__3`] || ''} onChange={set(`${f.key}__3`)} />}
                    {st && <p className={`text-xs ${st.tone === 'warn' ? 'text-amber-400' : st.tone === 'ok' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{st.text}</p>}
                  </div>
                );
              })}
            </div>
            <div className={card}>
              <p className="font-semibold text-sm">Como você mediu? (aumenta a confiança do resultado)</p>
              {CONDITIONS.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={!!cond[c.id]} onChange={(e) => setCond((s) => ({ ...s, [c.id]: e.target.checked }))} className="mt-1" />
                  <span>{c.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {!testsAllowed ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Os testes de esforço foram pulados para a sua segurança. Siga para o resultado das medidas corporais.
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Nível {LEVEL_INFO[level].label}: {tests.length} testes. Faça aquecimento leve antes e descanse de 2 a 3 min entre os testes. Pule o que não conseguir fazer.</p>
                {tests.map((t) => {
                  const tool = TOOLS[t.id];
                  const first = t.fields[0];
                  return (
                    <section key={t.id} className={card}>
                      <h2 className="font-semibold">{t.title}</h2>
                      <p className="text-xs text-muted-foreground">{t.why}</p>
                      <ol className="list-decimal pl-5 text-sm space-y-1">{t.how.map((h) => <li key={h}>{h}</li>)}</ol>
                      <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 p-2"><b>Pare se:</b> {t.stop}</p>
                      {t.variations && (
                        <label className="block text-sm">Variação usada
                          <select value={variation[t.variations.key] || ''} onChange={(e) => setVariation((s) => ({ ...s, [t.variations!.key]: e.target.value }))}
                            className="block w-full mt-1 bg-card border border-border p-3 rounded-xl">
                            <option value="">Selecione</option>
                            {t.variations.options.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        </label>
                      )}

                      {tool?.timer && !tool.timer.perField && (
                        <TestTimer mode={tool.timer.mode} seconds={tool.timer.seconds}
                          onDone={(sec) => { setTimerUsed((s) => ({ ...s, [t.id]: true })); if (tool.timer!.mode === 'stopwatch') set(first.key)(String(sec)); }} />
                      )}
                      {tool?.counter && first && <RepCounter value={values[first.key] || ''} onChange={(v) => { setTimerUsed((s) => ({ ...s, [t.id]: true })); set(first.key)(v); }} />}

                      {t.fields.map((f) => (
                        <div key={f.key} className="space-y-2">
                          {tool?.timer?.perField && (
                            <TestTimer mode={tool.timer.mode} seconds={tool.timer.seconds}
                              onDone={(sec) => { setTimerUsed((s) => ({ ...s, [t.id]: true })); set(f.key)(String(sec)); }} />
                          )}
                          <FieldInput f={f} value={values[f.key] || ''} onChange={set(f.key)} />
                        </div>
                      ))}
                    </section>
                  );
                })}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className={card}>
              <p className="text-sm">Confiabilidade: <b className="text-primary">{r.conf.label}</b> ({r.conf.points} de {r.conf.max} pontos)</p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full orange-satin" style={{ width: `${(r.conf.points / r.conf.max) * 100}%` }} /></div>
              {r.conf.tips.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">Para chegar a {r.conf.max} de {r.conf.max}:</p>
                  <ul className="list-disc pl-5 text-xs space-y-1">{r.conf.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="text-xs text-muted-foreground">Você pode voltar nos passos anteriores e corrigir antes de salvar.</p>
                </>
              ) : <p className="text-xs text-emerald-400">Medidas conferidas, condições ideais e testes completos.</p>}
            </div>
            <div className={card}>
              {r.imc !== null && <p className="text-sm"><b>IMC {r.imc}</b>: {imcFaixa(r.imc)}. O IMC não separa massa muscular de gordura.</p>}
              {r.rce !== null && <p className="text-sm"><b>Cintura/altura {r.rce}</b>: {r.rce >= 0.5 ? 'acima de 0,5, ponto de atenção para gordura abdominal; vale acompanhar.' : 'abaixo de 0,5.'}</p>}
              {r.rcq !== null && <p className="text-sm"><b>Cintura/quadril {r.rcq}</b>{sexo ? (rcqAtencao(r.rcq, sexo) ? ': acima do ponto de atenção da OMS.' : ': dentro da referência da OMS.') : '.'}</p>}
              {r.bf !== null && <p className="text-sm"><b>Gordura corporal estimada: entre {Math.max(2, Math.round(r.bf - 4))}% e {Math.round(r.bf + 4)}%</b> (valor central {r.bf}%, método da Marinha dos EUA). É uma estimativa; use para acompanhar a evolução.</p>}
              {testsAllowed && r.rm.sup !== null && <p className="text-sm"><b>Supino estimado:</b> {r.rm.sup} kg (1RM)</p>}
              {testsAllowed && r.rm.agach !== null && <p className="text-sm"><b>Agachamento estimado:</b> {r.rm.agach} kg (1RM)</p>}
              {testsAllowed && r.rm.pux !== null && <p className="text-sm"><b>Remada/puxada estimada:</b> {r.rm.pux} kg (1RM)</p>}
              {testsAllowed && <p className="text-sm text-muted-foreground">{r.done} de {tests.length} testes preenchidos.</p>}
            </div>
            {(r.peso !== null || r.altura !== null) && (
              <label className="flex items-start gap-2 text-sm rounded-xl border border-border p-3">
                <input type="checkbox" checked={updateProfile} onChange={(e) => setUpdateProfile(e.target.checked)} className="mt-1" />
                <span>Atualizar meu peso e altura no perfil com estes valores ({[r.peso !== null ? `${r.peso} kg` : null, r.altura !== null ? `${r.altura} cm` : null].filter(Boolean).join(', ')}). Desmarque para manter o perfil como está.</span>
              </label>
            )}
            {params.get('returnTo') !== 'progresso' && (
              <div className={card}>
                <p className="font-semibold text-sm">Para montar seu treino</p>
                <label className="block text-sm">Objetivo
                  <select value={goal} onChange={(e) => setGoal(e.target.value)} className="block w-full mt-1 bg-card border border-border p-3 rounded-xl">
                    {['Hipertrofia e Definição', 'Emagrecimento', 'Força', 'Saúde e Bem-estar'].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Treinos por semana
                  <input type="number" min={1} max={7} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="block w-full mt-1 bg-card border border-border p-3 rounded-xl" />
                </label>
                <label className="block text-sm">Restrições ou lesões
                  <textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="block w-full mt-1 bg-card border border-border p-3 rounded-xl" />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep((s) => s - 1)} className={`${btn} border border-border`}>Voltar</button>}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={`${btn} orange-satin`}>Continuar</button>
          ) : (
            <button type="button" onClick={save} disabled={saving || !athleteId} className={`${btn} orange-satin`}>{saving ? 'Salvando…' : 'Salvar avaliação'}</button>
          )}
        </div>
      </div>
      <BottomNavigation />
    </main>
  );
}
