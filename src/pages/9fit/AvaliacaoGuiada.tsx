import { useEffect, useMemo, useState } from 'react';
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
  type Field, type Level, type Sexo, type Test,
} from '@/lib/guidedAssessment';
import { computeConfidence, isReliable, resolveMeasure, tolerance, type Resolved } from '@/lib/guidedReliability';
import {
  BALANCE_TEST, GOALS, METHOD_CARDS, PHOTO_PROTOCOL, PHOTO_VIEWS, REACH_TEST, RML_TESTS, STEP_TEST_FIELD, type PhotoView,
} from '@/lib/guidedMethods';

const STEPS = ['Métodos', 'Dados', 'Resistência', 'Corpo', 'Ir além', 'Resultado'] as const;

/** Ferramentas por teste: cronômetro e contador de repetições (reduzem o erro de medir sozinho). */
const TOOLS: Record<string, { timer?: { mode: 'countdown' | 'stopwatch'; seconds?: number; perField?: boolean }; counter?: boolean }> = {
  fc_repouso: { timer: { mode: 'countdown', seconds: 60 } },
  sentar_levantar_30s: { timer: { mode: 'countdown', seconds: 30 }, counter: true },
  prancha: { timer: { mode: 'stopwatch' } },
  prancha_lateral: { timer: { mode: 'stopwatch', perField: true } },
  agachamento: { timer: { mode: 'countdown', seconds: 60 }, counter: true },
  flexao: { timer: { mode: 'countdown', seconds: 60 }, counter: true },
  elevacao_pelvica: { timer: { mode: 'countdown', seconds: 60 }, counter: true },
  abdominal: { timer: { mode: 'countdown', seconds: 60 }, counter: true },
  equilibrio_unipodal: { timer: { mode: 'stopwatch', perField: true } },
  barra: { counter: true },
};

async function compressPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao processar a foto'))), 'image/jpeg', 0.85));
}

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
  const [idade, setIdade] = useState('');
  const [goal, setGoal] = useState<string>(GOALS[0]);
  const [screen, setScreen] = useState<Record<string, boolean>>({});
  const [feelsWell, setFeelsWell] = useState(false);
  const [cond, setCond] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [variation, setVariation] = useState<Record<string, string>>({});
  const [timerUsed, setTimerUsed] = useState<Record<string, boolean>>({});
  const [openExtra, setOpenExtra] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Partial<Record<PhotoView, File>>>({});
  const [photoConsent, setPhotoConsent] = useState(false);
  const [sharePhotosWithCoach, setSharePhotosWithCoach] = useState(false);
  const [updateProfile, setUpdateProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [frequency, setFrequency] = useState(3);
  const [restrictions, setRestrictions] = useState('');

  // idade já cadastrada no perfil
  useEffect(() => {
    if (!athleteId) return;
    supabase.from('athletes').select('age').eq('id', athleteId).maybeSingle().then(({ data }) => {
      const a = (data as any)?.age; if (a && !idade) setIdade(String(a));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const set = (k: string) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const restricted = SCREENING.some((q) => screen[q.id]);
  const testsAllowed = !restricted && feelsWell;

  const basics = MEASURES.filter((m) => m.key === 'peso' || m.key === 'altura');
  const bodyMeasures = MEASURES.filter((m) => m.key !== 'peso' && m.key !== 'altura');
  const iniciante = TESTS_BY_LEVEL.iniciante;
  const avancado = TESTS_BY_LEVEL.avancado;
  const extras: Test[] = useMemo(() => {
    const list: Test[] = [
      iniciante.find((t) => t.id === 'fc_repouso')!,
      iniciante.find((t) => t.id === 'sentar_levantar_30s')!,
      { id: 'step_test', title: 'Teste do degrau (YMCA, 3 minutos)', why: 'Condicionamento aeróbio submáximo: quanto menor a FC de recuperação, melhor.', how: ['Degrau firme de ~30 cm (ex.: primeiro degrau alto de escada). Cadencia: um ciclo (sobe, sobe, desce, desce) a cada 4 bipes, por 3 minutos.', 'Ao terminar, sente-se imediatamente e conte seus batimentos por 1 minuto inteiro (use o segundo cronômetro).', 'Informe os batimentos contados.'], stop: 'Pare se sentir dor no peito, tontura ou falta de ar fora do normal. Não faça se tiver problema no joelho ao subir degraus.', fields: [{ ...STEP_TEST_FIELD }] },
      BALANCE_TEST,
      REACH_TEST,
      TESTS_BY_LEVEL.intermediario.find((t) => t.id === 'prancha_lateral')!,
    ];
    if (level !== 'iniciante') {
      list.push(avancado.find((t) => t.id === 'barra')!);
      list.push(...avancado.filter((t) => t.id.startsWith('rm_')));
    }
    return list;
  }, [level, iniciante, avancado]);

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
    const done = RML_TESTS.reduce((a, t) => a + (t.fields.some((f) => n(f.key) !== null) ? 1 : 0), 0);
    const timedDone = RML_TESTS.filter((t) => t.fields.some((f) => n(f.key) !== null) && timerUsed[t.id]).length;
    const coreReliable = [res.peso, res.altura, res.circunferencia_cintura].filter(isReliable).length;
    const conf = computeConfidence({
      conditionsChecked: CONDITIONS.filter((c) => cond[c.id]).length, conditionsTotal: CONDITIONS.length,
      coreReliable, bodyFatAvailable: bf !== null, testsAllowed, testsDone: done, testsTotal: RML_TESTS.length,
      timerTests: timedDone, timedTestsTotal: done,
    });
    return { peso, altura, bf, imc: imc(peso, altura), rce: rce(cintura, altura), rcq: rcq(cintura, quadril), rm: { sup: rm('rm_supino'), agach: rm('rm_agachamento'), pux: rm('rm_puxada') }, done, conf };
  }, [values, res, sexo, cond, testsAllowed, timerUsed]);

  const rangeError = (tests: Test[]): string | null => {
    for (const t of tests) for (const f of t.fields) {
      const raw = values[f.key];
      if (raw && raw.trim() !== '') {
        const v = parseNum(raw);
        if (v === null || v < f.min || v > f.max) return `Confira o valor: ${t.title} — ${f.label}.`;
      }
    }
    return null;
  };
  const measureError = (list: typeof MEASURES): string | null => {
    for (const f of list) {
      for (const i of [1, 2, 3]) {
        const raw = values[`${f.key}__${i}`];
        if (raw && raw.trim() !== '') {
          const v = parseNum(raw);
          if (v === null || v < f.min || v > f.max) return `Confira a medida: ${f.label}.`;
        }
      }
      if (res[f.key].status === 'discordant') return `${f.label}: as duas leituras divergem. Faça uma 3ª medida.`;
    }
    return null;
  };

  function validateStep(): string | null {
    if (step === 1) {
      const age = parseNum(idade);
      if (age === null || age < 10 || age > 100) return 'Informe sua idade (10 a 100 anos).';
      if (!SCREENING.every((q) => q.id in screen)) return 'Responda todas as perguntas de saúde.';
      for (const k of ['peso', 'altura']) if (res[k].value === null) return 'Informe peso e altura.';
      return measureError(basics);
    }
    if (step === 2 && testsAllowed) return rangeError(RML_TESTS);
    if (step === 3) {
      if (Object.values(photos).some(Boolean) && !photoConsent) return 'Para enviar fotos, marque a autorização de guarda privada.';
      return measureError(bodyMeasures);
    }
    if (step === 4 && testsAllowed) return rangeError(extras);
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
    const data: Record<string, number | string | object | boolean> = {};
    data.photo_consent = photoConsent;
    data.share_photos_with_coach = photoConsent && sharePhotosWithCoach;
    const put = (key: string, v: number | null) => { if (v !== null) data[key] = v; };
    for (const f of MEASURES) put(f.key, res[f.key].value);
    put('idade', parseNum(idade));
    if (r.bf !== null) { data.gordura_corporal = r.bf; data.metodo_gordura = 'us_navy_estimativa'; }
    if (testsAllowed) {
      for (const t of [...RML_TESTS, ...extras]) for (const f of t.fields) if (!f.key.startsWith('rm_')) put(f.key, n(f.key));
      put('rm1_empurrar_superior', r.rm.sup); put('rm1_empurrar_perna', r.rm.agach); put('rm1_puxar_costas', r.rm.pux);
    }
    if (Object.keys(data).filter((k) => typeof data[k] === 'number').length <= 1) return toast.error('Informe ao menos uma medida.');
    data.nivel = level;
    data.objetivo = goal;
    data.confianca = `${r.conf.label} (${r.conf.points}/${r.conf.max})`;
    data.triagem = { restrito: restricted, sentindo_bem_hoje: feelsWell, respostas_sim: SCREENING.filter((q) => screen[q.id]).map((q) => q.id) };
    const leituras: Record<string, { leituras: number[]; status: string }> = {};
    for (const f of MEASURES) if (res[f.key].status !== 'none') leituras[f.key] = { leituras: res[f.key].readings, status: res[f.key].status };
    data.condicoes = { ...cond, flexao_variacao: variation.flexao_variacao || null, leituras, cronometro_app: Object.keys(timerUsed).filter((k) => timerUsed[k]) };

    setSaving(true);
    try {
      // fotos: bucket privado student-photos, pasta = id do atleta
      const paths: string[] = [];
      for (const view of PHOTO_VIEWS) {
        const file = photos[view.id];
        if (!file) continue;
        const blob = await compressPhoto(file);
        const path = `${athleteId}/${view.id}_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('student-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (upErr) throw new Error(`Não foi possível enviar a foto (${view.label}): ${upErr.message}`);
        paths.push(path);
      }
      if (paths.length) data.fotos = paths;

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

  const MeasureBlock = ({ f }: { f: (typeof MEASURES)[number] }) => {
    const tol = tolerance(f.key);
    const st = statusText(res[f.key], f.unit, tol);
    const showThird = res[f.key].status === 'discordant' || res[f.key].status === 'median3';
    return (
      <div className="space-y-2 pb-3 border-b border-border/50 last:border-0">
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
  };

  const TestCard = ({ t }: { t: Test }) => {
    const tool = TOOLS[t.id];
    const first = t.fields[0];
    return (
      <section className={card}>
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
        {t.id === 'step_test' && (
          <>
            <TestTimer mode="countdown" seconds={180} metronomeBpm={96} onDone={() => setTimerUsed((s) => ({ ...s, [t.id]: true }))} />
            <p className="text-xs text-muted-foreground">Agora sente-se e inicie a contagem de 1 minuto:</p>
            <TestTimer mode="countdown" seconds={60} onDone={() => setTimerUsed((s) => ({ ...s, [t.id]: true }))} />
          </>
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
  };

  const skipped = (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      Os testes de esforço foram pulados para a sua segurança. Siga para a próxima etapa.
    </div>
  );

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

        {/* 0 — MÉTODOS */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Você faz tudo sozinho, com passo a passo, cronômetro e medidas conferidas em duplicata. Estes são os métodos e a evidência por trás de cada um. Total: 30 a 45 minutos. Pode ser feito em dois dias. Não substitui consulta médica.</p>
            {METHOD_CARDS.map((m) => (
              <section key={m.id} className={card}>
                <h2 className="font-semibold">{m.title}{m.optional ? <span className="text-xs font-normal text-muted-foreground"> · opcional</span> : null}</h2>
                <p className="text-sm"><b>O que mede:</b> {m.measures}</p>
                <p className="text-xs text-muted-foreground"><b>Base científica:</b> {m.evidence}</p>
                <p className="text-xs text-muted-foreground">Tempo: {m.time} · Precisa de: {m.needs}</p>
              </section>
            ))}
            <p className="text-xs text-muted-foreground">Todos os números são estimativas de campo, sem valor de diagnóstico. O valor está em repetir o mesmo protocolo daqui a 4 a 8 semanas e ver a sua evolução.</p>
          </div>
        )}

        {/* 1 — DADOS E PAR-Q */}
        {step === 1 && (
          <div className="space-y-4">
            <div className={card}>
              <p className="font-semibold">Quem é você</p>
              <label className="block text-sm">Idade
                <input aria-label="Idade" inputMode="numeric" value={idade} onChange={(e) => setIdade(e.target.value)} className="block w-full mt-1 rounded-xl border border-border bg-card p-3" />
              </label>
              <div>
                <p className="text-sm">Sexo biológico <span className="text-xs text-muted-foreground">(só para a estimativa de gordura; não fica salvo)</span></p>
                <div className="flex gap-2 mt-1">
                  {([['F', 'Feminino'], ['M', 'Masculino'], [null, 'Prefiro não informar']] as [Sexo, string][]).map(([v, l]) => (
                    <button key={l} type="button" onClick={() => setSexo(v)} className={`flex-1 rounded-xl border p-2 text-xs ${sexo === v ? 'border-primary bg-primary/10' : 'border-border'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <label className="block text-sm">Objetivo principal
                <select value={goal} onChange={(e) => setGoal(e.target.value)} className="block w-full mt-1 bg-card border border-border p-3 rounded-xl">
                  {GOALS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <div>
                <p className="text-sm">Seu nível de treino</p>
                {(Object.keys(LEVEL_INFO) as Level[]).map((l) => (
                  <button key={l} type="button" onClick={() => setLevel(l)} className={`w-full text-left rounded-xl border p-2 mt-1 ${level === l ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <span className="text-sm font-semibold">{LEVEL_INFO[l].label}</span>
                    <span className="block text-xs text-muted-foreground">{LEVEL_INFO[l].desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={card}>
              <p className="font-semibold">Peso e altura</p>
              <p className="text-xs text-muted-foreground">Meça duas vezes. Se divergirem além da tolerância, pediremos uma terceira.</p>
              {basics.map((f) => <MeasureBlock key={f.key} f={f} />)}
            </div>

            <div className={card}>
              <p className="font-semibold">Triagem de saúde (PAR-Q)</p>
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
            {restricted ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Você respondeu "sim" a pelo menos uma pergunta. Vamos registrar apenas as <b>medidas corporais</b> e fotos, e pular os testes de esforço. Procure avaliação médica antes de fazer testes físicos.
              </div>
            ) : (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={feelsWell} onChange={(e) => setFeelsWell(e.target.checked)} className="mt-1" />
                <span>Hoje estou bem: sem febre, dor ou mal-estar, e descansado. Se não estiver, deixe desmarcado: vamos registrar só as medidas.</span>
              </label>
            )}
          </div>
        )}

        {/* 2 — RESISTÊNCIA MUSCULAR LOCALIZADA */}
        {step === 2 && (
          !testsAllowed ? skipped : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">5 testes na ordem abaixo. Faça 5 minutos de aquecimento leve antes e descanse de 2 a 3 minutos entre os testes. Conte apenas repetições completas. Pule o que não conseguir fazer. No reteste, use exatamente o mesmo protocolo.</p>
              {RML_TESTS.map((t) => <TestCard key={t.id} t={t} />)}
            </div>
          )
        )}

        {/* 3 — CORPO */}
        {step === 3 && (
          <div className="space-y-4">
            <div className={card}>
              <p className="font-semibold">Circunferências</p>
              <p className="text-xs text-muted-foreground">Cintura, quadril e pescoço permitem calcular as relações e a gordura estimada. Meça duas vezes.</p>
              {bodyMeasures.map((f) => <MeasureBlock key={f.key} f={f} />)}
            </div>
            <div className={card}>
              <p className="font-semibold text-sm">Como você mediu? (aumenta a confiança)</p>
              {CONDITIONS.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={!!cond[c.id]} onChange={(e) => setCond((s) => ({ ...s, [c.id]: e.target.checked }))} className="mt-1" />
                  <span>{c.text}</span>
                </label>
              ))}
            </div>
            <div className={card}>
              <p className="font-semibold">Fotos de antes e depois <span className="text-xs font-normal text-muted-foreground">(opcional)</span></p>
              <ul className="list-disc pl-5 text-xs space-y-1">{PHOTO_PROTOCOL.map((p) => <li key={p}>{p}</li>)}</ul>
              <div className="grid grid-cols-3 gap-2">
                {PHOTO_VIEWS.map((v) => (
                  <label key={v.id} className="block text-center text-xs border border-dashed border-border rounded-xl p-2 cursor-pointer">
                    {photos[v.id] ? <img src={URL.createObjectURL(photos[v.id]!)} alt={v.label} className="w-full h-24 object-cover rounded-lg mb-1" /> : <div className="h-24 flex items-center justify-center text-muted-foreground">+ foto</div>}
                    {v.label}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPhotos((p) => ({ ...p, [v.id]: file })); }} />
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="mt-0.5" />
                <span>Autorizo guardar estas fotos em área privada, visível apenas para mim. Posso apagar quando quiser.</span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={sharePhotosWithCoach} disabled={!photoConsent} onChange={e=>setSharePhotosWithCoach(e.target.checked)} className="mt-0.5" />
                <span>Também autorizo os profissionais vinculados a mim a ver estas fotos. Esta permissão é opcional.</span>
              </label>
              <button type="button" className="min-h-10 text-xs text-primary underline" onClick={async()=>{
                if (!athleteId) return;
                const {error}=await (supabase as any).from('student_photos').update({share_with_coach:false}).eq('athlete_id',athleteId);
                if(error)toast.error('Não foi possível revogar a permissão. Tente novamente.');else toast.success('Compartilhamento das fotos anteriores revogado.');
              }}>Revogar compartilhamento das fotos anteriores</button>
            </div>
          </div>
        )}

        {/* 4 — IR ALÉM */}
        {step === 4 && (
          !testsAllowed ? skipped : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Tudo aqui é opcional. Abra só o que quiser fazer agora. Você pode pular esta etapa.</p>
              {extras.map((t) => (
                <div key={t.id}>
                  <button type="button" onClick={() => setOpenExtra((s) => ({ ...s, [t.id]: !s[t.id] }))}
                    className={`w-full text-left rounded-xl border p-3 ${openExtra[t.id] ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <span className="font-semibold text-sm">{t.title}</span>
                    <span className="block text-xs text-muted-foreground">{t.why}</span>
                  </button>
                  {openExtra[t.id] && <div className="mt-2"><TestCard t={t} /></div>}
                </div>
              ))}
            </div>
          )
        )}

        {/* 5 — RESULTADO */}
        {step === 5 && (
          <div className="space-y-4">
            <div className={card}>
              <p className="text-sm">Confiabilidade: <b className="text-primary">{r.conf.label}</b> ({r.conf.points} de {r.conf.max} pontos)</p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full orange-satin" style={{ width: `${(r.conf.points / r.conf.max) * 100}%` }} /></div>
              {r.conf.tips.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">Para chegar a {r.conf.max} de {r.conf.max}:</p>
                  <ul className="list-disc pl-5 text-xs space-y-1">{r.conf.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="text-xs text-muted-foreground">Você pode voltar e corrigir antes de salvar.</p>
                </>
              ) : <p className="text-xs text-emerald-400">Medidas conferidas, condições ideais e testes completos.</p>}
            </div>
            <div className={card}>
              <p className="font-semibold text-sm">Corpo</p>
              {r.imc !== null && <p className="text-sm"><b>IMC {r.imc}</b>: {imcFaixa(r.imc)}. O IMC não separa massa muscular de gordura.</p>}
              {r.rce !== null && <p className="text-sm"><b>Cintura/altura {r.rce}</b>: {r.rce >= 0.5 ? 'acima de 0,5, ponto de atenção para gordura abdominal; vale acompanhar.' : 'abaixo de 0,5.'}</p>}
              {r.rcq !== null && <p className="text-sm"><b>Cintura/quadril {r.rcq}</b>{sexo ? (rcqAtencao(r.rcq, sexo) ? ': acima do ponto de atenção da OMS.' : ': dentro da referência da OMS.') : '.'}</p>}
              {r.bf !== null && <p className="text-sm"><b>Gordura corporal estimada: entre {Math.max(2, Math.round(r.bf - 4))}% e {Math.round(r.bf + 4)}%</b> (valor central {r.bf}%, método da Marinha dos EUA). Use para acompanhar a evolução.</p>}
              {Object.values(photos).filter(Boolean).length > 0 && <p className="text-sm">{Object.values(photos).filter(Boolean).length} foto(s) serão guardadas em área privada.</p>}
            </div>
            {testsAllowed && (
              <div className={card}>
                <p className="font-semibold text-sm">Resistência muscular localizada ({r.done} de {RML_TESTS.length} testes)</p>
                {RML_TESTS.map((t) => {
                  const v = parseNum(values[t.fields[0].key]);
                  return v === null ? null : <p key={t.id} className="text-sm"><b>{t.title.split(' —')[0]}:</b> {v} {t.fields[0].unit}</p>;
                })}
                <p className="text-xs text-muted-foreground">Sem tabela de referência aqui de propósito: o que importa é repetir o mesmo protocolo em 4 a 8 semanas e comparar com estes números.</p>
                {r.rm.sup !== null && <p className="text-sm"><b>Supino estimado:</b> {r.rm.sup} kg (1RM)</p>}
                {r.rm.agach !== null && <p className="text-sm"><b>Agachamento estimado:</b> {r.rm.agach} kg (1RM)</p>}
                {r.rm.pux !== null && <p className="text-sm"><b>Remada/puxada estimada:</b> {r.rm.pux} kg (1RM)</p>}
              </div>
            )}
            {(r.peso !== null || r.altura !== null) && (
              <label className="flex items-start gap-2 text-sm rounded-xl border border-border p-3">
                <input type="checkbox" checked={updateProfile} onChange={(e) => setUpdateProfile(e.target.checked)} className="mt-1" />
                <span>Atualizar meu peso e altura no perfil com estes valores ({[r.peso !== null ? `${r.peso} kg` : null, r.altura !== null ? `${r.altura} cm` : null].filter(Boolean).join(', ')}). Desmarque para manter o perfil como está.</span>
              </label>
            )}
            {params.get('returnTo') !== 'progresso' && (
              <div className={card}>
                <p className="font-semibold text-sm">Para montar seu treino</p>
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
            <button type="button" onClick={next} className={`${btn} orange-satin`}>{step === 0 ? 'Começar' : 'Continuar'}</button>
          ) : (
            <button type="button" onClick={save} disabled={saving || !athleteId} className={`${btn} orange-satin`}>{saving ? 'Salvando…' : 'Salvar avaliação'}</button>
          )}
        </div>
      </div>
      <BottomNavigation />
    </main>
  );
}
