import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Beaker, Clock, ArrowLeft, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CAT_LABELS: Record<string, string> = {
  sleep: "Sono", recovery: "Recuperação", energy: "Energia", performance: "Performance",
};

export default function NineFitProtocols() {
  const { category, id } = useParams<{ category?: string; id?: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [completing,setCompleting]=useState(false);

  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(false);
  const [reload,setReload]=useState(0);
  useEffect(() => {
    let active=true;setLoading(true);setLoadError(false);setCurrent(null);setItems([]);
    let query=supabase.from('biohacker_protocols').select('*').eq('status','active');
    if(id)query=query.eq('id',id);
    else if(category)query=query.eq('category',category);
    void query.order('difficulty').limit(20).then(({data,error})=>{
      if(!active)return;
      setLoading(false);
      if(error){setLoadError(true);return;}
      if(id)setCurrent(data?.[0]??null);else setItems(data??[]);
    });
    return()=>{active=false;};
  }, [category,id,reload]);

  async function complete() {
    if (!current || completing) return;
    setCompleting(true);
    try {
      const {data,error}=await supabase.rpc('fn_complete_student_protocol' as any,{p_protocol_id:current.id});
      if(error || !(data as any)?.saved)throw error || new Error('Conclusão não confirmada');
      window.dispatchEvent(new Event('9fit:protocol_completed'));
      window.dispatchEvent(new Event('9fit:xp_awarded'));
      toast.success((data as any).already_completed?'Protocolo já registrado hoje.':'Conclusão registrada');
      navigate(`/9fit/protocols/${current.category}`);
    } catch {toast.error('Não foi possível registrar a conclusão. Tente novamente.');}
    finally {setCompleting(false);}
  }

  if(loading)return <div className="p-6">Carregando protocolos…</div>;
  if(loadError)return <div className="p-6 space-y-4"><p>Não foi possível carregar os protocolos.</p><Button onClick={()=>setReload(value=>value+1)}>Tentar novamente</Button></div>;
  if(id && !current)return <div className="p-6 space-y-4"><p>Protocolo não disponível.</p><Button onClick={()=>navigate('/9fit/protocols')}>Ver protocolos</Button></div>;
  if (current) {
    const steps: any[] = Array.isArray(current.steps) ? current.steps : [];
    return (
      <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto space-y-5">
        <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Voltar</button>
        {current.hero_image && <img src={current.hero_image} alt={current.name} className="rounded-xl w-full border border-border" />}
        <div className="flex items-center gap-2">
          <Badge>{CAT_LABELS[current.category]}</Badge>
          <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {current.duration_min}min</Badge>
          <Badge variant="outline">{current.difficulty}</Badge>
        </div>
        <h1 className="text-3xl font-display italic">{current.name}</h1>
        <p className="text-muted-foreground">{current.description}</p>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 p-3 rounded-md border border-border">
              <span className="text-primary font-mono">{String(i+1).padStart(2,"0")}</span>
              <div><div className="font-semibold text-sm">{s.title ?? s}</div>{s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}</div>
            </li>
          ))}
        </ol>
        <Button size="lg" className="w-full" onClick={complete} disabled={completing}><CheckCircle2 className="w-4 h-4 mr-2" /> Marcar concluído</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Beaker className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display italic">Protocolos {category ? CAT_LABELS[category] : "Biohacker"}</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((p) => (
          <Card key={p.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-3">
              {p.hero_image && <img src={p.hero_image} alt={p.name} className="rounded-md w-full aspect-video object-cover" />}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{CAT_LABELS[p.category]}</Badge>
                <span className="text-muted-foreground">{p.duration_min}min · {p.difficulty}</span>
              </div>
              <h3 className="font-display">{p.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              <Button size="sm" variant="outline" className="w-full"
                onClick={() => navigate(`/9fit/protocols/${p.category}/${p.id}`)}>
                <Play className="w-3 h-3 mr-1" /> Iniciar
              </Button>
            </CardContent>
          </Card>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground col-span-2">Sem protocolos nesta categoria.</p>}
      </div>
    </div>
  );
}
