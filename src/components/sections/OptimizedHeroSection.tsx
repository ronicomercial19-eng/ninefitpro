import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronLeft, ChevronRight, Crown, Image as ImageIcon, Pause, Play, Sparkles, TrendingUp, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const OptimizedHeroSection = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = [
    { kind: "image", src: "/landing-media/hero.jpg", label: "9FIT PRO", title: "O treino inteligente começa com você", description: "Um plano que entende seu corpo, sua rotina e seu próximo objetivo." },
    { kind: "video", src: "/landing-media/campanha-1.mp4", label: "TREINO COM IA", title: "Seu treino muda junto com seu progresso", description: "A inteligência do FitPro ajusta a estratégia para você evoluir com consistência." },
    { kind: "image", src: "/landing-media/ajuste.jpg", label: "SMART TREINO", title: "Ajustes precisos para cada fase", description: "Volume, recuperação e intensidade alinhados ao que seu corpo precisa hoje." },
    { kind: "image", src: "/landing-media/treino-inteligente.jpg", label: "PERIODIZAÇÃO", title: "Previsão de carga sem achismo", description: "Visualize seu ciclo, acompanhe o volume e treine com mais segurança." },
    { kind: "video", src: "/landing-media/campanha-2.mp4", label: "EXECUÇÃO", title: "Treine com referências em vídeo", description: "Veja a execução correta e transforme cada série em progresso real." },
    { kind: "image", src: "/landing-media/biblioteca.jpg", label: "BIBLIOTECA 9FIT", title: "Conhecimento sempre à mão", description: "Vídeos, protocolos e conteúdos para você tomar decisões melhores." },
    { kind: "image", src: "/landing-media/daily-protocol.jpg", label: "PROTOCOLO DIÁRIO", title: "Pequenas ações, grandes resultados", description: "Um protocolo inteligente para manter ritmo, recuperação e foco." },
    { kind: "image", src: "/landing-media/comunidade.jpg", label: "ECOSSISTEMA 9FIT", title: "Treino, progresso e conexões", description: "Tudo que você precisa para evoluir em um só lugar." },
  ] as const;
  const visibleMedia = useMemo(() => filter === "all" ? media : media.filter((item) => item.kind === filter), [filter]);
  const active = visibleMedia[activeIndex] ?? visibleMedia[0];

  useEffect(() => {
    setIsVisible(true);
  }, []);
  useEffect(() => setActiveIndex(0), [filter]);
  useEffect(() => {
    if (!isAutoPlaying || isHovered || active.kind === "video") return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % visibleMedia.length), 6500);
    return () => window.clearInterval(timer);
  }, [active.kind, isAutoPlaying, isHovered, visibleMedia.length]);
  useEffect(() => {
    if (active.kind === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isAutoPlaying && !isHovered) videoRef.current.play().catch(() => undefined);
      else videoRef.current.pause();
    }
  }, [active, isAutoPlaying, isHovered]);
  const goTo = (index: number) => setActiveIndex((index + visibleMedia.length) % visibleMedia.length);

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-orange-300 to-orange-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className={`container relative z-10 mx-auto px-6 pb-20 pt-32 transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <div className="mx-auto max-w-7xl">
          <Badge className="mb-6 bg-orange-500/10 text-orange-500 border-orange-500/20 px-6 py-3 text-base font-medium backdrop-blur-sm">
            <Crown className="w-5 h-5 mr-2" />
            Menos é Mais. O Essencial Energiza.
          </Badge>

          <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl lg:text-7xl">
            Seu próximo nível começa com um plano que <span className="text-orange-500">se adapta.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Treinos personalizados, execução guiada e inteligência para ajustar cada detalhe da sua evolução.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate('/sales')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <TrendingUp className="mr-2 w-5 h-5" />
              Transformar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/ai-training')} className="border-white/20 bg-transparent px-8 py-4 text-lg text-white hover:bg-white/10"><Play className="mr-2 h-5 w-5" /> Ver IA em Ação</Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left">
            <span className="mr-2 hidden px-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 md:inline">Conteúdo em destaque</span>
            {(["all", "video", "image"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${filter === item ? "bg-orange-500 text-black" : "text-zinc-300 hover:bg-white/10"}`}>{item === "video" ? <Video className="h-4 w-4" /> : item === "image" ? <ImageIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{item === "all" ? "Tudo" : item === "video" ? "Vídeos" : "Imagens"}</button>)}
            <button onClick={() => setIsAutoPlaying((value) => !value)} className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10">{isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isAutoPlaying ? "Automático" : "Manual"}</button>
          </div>

          <div className="mt-5 grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="relative mx-auto w-full max-w-[720px]" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              <div className="aspect-square overflow-hidden rounded-[2rem] border border-orange-500/30 bg-zinc-950 shadow-[0_0_80px_rgba(255,103,24,0.16)]">
                {active.kind === "video" ? <video ref={videoRef} key={active.src} src={active.src} className="h-full w-full object-cover" muted playsInline autoPlay={isAutoPlaying && !isHovered} onEnded={() => goTo(activeIndex + 1)} /> : <img key={active.src} src={active.src} alt={active.title} className="h-full w-full object-cover" />}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-400">{active.label}</p><p className="mt-1 text-lg font-bold">{active.title}</p></div><span className="rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur">{activeIndex + 1}/{visibleMedia.length}</span></div>
              </div>
              <button onClick={() => goTo(activeIndex - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white backdrop-blur hover:border-orange-400 hover:text-orange-400" aria-label="Mídia anterior"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => goTo(activeIndex + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white backdrop-blur hover:border-orange-400 hover:text-orange-400" aria-label="Próxima mídia"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-left md:p-9"><p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-500">{active.label}</p><h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">{active.title}</h2><p className="mt-4 text-lg leading-relaxed text-zinc-300">{active.description}</p><div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => navigate("/app")} className="rounded-full bg-orange-500 px-5 font-bold text-black hover:bg-orange-400">Conhecer o FitPro <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" onClick={() => goTo(activeIndex + 1)} className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"><Play className="mr-2 h-4 w-4" /> Próximo</Button></div><div className="mt-9 flex gap-2" role="tablist" aria-label="Selecionar mídia">{visibleMedia.map((item, index) => <button key={item.src} onClick={() => goTo(index)} aria-label={`Mostrar ${item.title}`} aria-selected={index === activeIndex} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-10 bg-orange-500" : "w-3 bg-zinc-700 hover:bg-zinc-500"}`} />)}</div></div>
          </div>

          {/* Enhanced Stats with Animation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {[
              { value: "+10k", label: "Transformações", desc: "Vidas mudadas" },
              { value: "95%", label: "Taxa de Sucesso", desc: "Resultados comprovados" },
              { value: "21 dias", label: "Primeiros Resultados", desc: "Mudanças visíveis" }
            ].map((stat, index) => (
              <div
                key={index}
                className={`text-center transform transition-all duration-700 delay-${index * 200} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
              >
                <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2">{stat.value}</div>
                <div className="text-lg font-semibold text-white mb-1">{stat.label}</div>
                <div className="text-sm text-gray-400">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-zinc-400 md:justify-start"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-orange-500" /> IA que aprende com você</span><span className="flex items-center gap-2"><Video className="h-4 w-4 text-orange-500" /> Execução guiada em vídeo</span><span className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-orange-500" /> Evolução acompanhada</span></div>
      </div>
    </section>
  );
};
