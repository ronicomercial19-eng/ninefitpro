import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssignedProtocols } from '@/components/9fit/AssignedProtocols';
import { ArrowLeft, ArrowDownRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import trainingImage from '@/assets/images/train_hero_banner_1790011808035.jpg';
import './protocolo.css';

export default function Protocolo() {
  const { athleteId, loading, error } = useAthleteId();
  return <div className="protocol-page min-h-screen pb-32">
    <main className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
      <nav aria-label="Voltar" className="mb-5"><Link to="/9fit/train" className="protocol-back"><ArrowLeft aria-hidden="true" size={18}/>Voltar ao Train</Link></nav>
      <header className="protocol-hero">
        <img src={trainingImage} alt="" className="protocol-hero-photo"/>
        <div className="protocol-hero-shade" aria-hidden="true"/>
        <div className="protocol-hero-copy">
          <p className="protocol-eyebrow"><Layers3 size={15} aria-hidden="true"/> NINE PRO / TRAIN</p>
          <h1>Seu próximo nível<br/><span>tem um plano.</span></h1>
          <p>Seu protocolo, do planejamento à prática.<br/>Treinos e materiais enviados pelo seu professor, em um só lugar.</p>
          <a href="#protocolos" className="protocol-hero-link">Explorar meus protocolos <ArrowDownRight size={18} aria-hidden="true"/></a>
        </div>
        <span className="protocol-hero-tag" aria-hidden="true">FOCO. MÉTODO. EVOLUÇÃO.</span>
      </header>
      <div id="protocolos" className="protocol-content">
        <div className="protocol-content-heading"><div><p className="protocol-eyebrow">SUA BIBLIOTECA DE TREINO</p><h2>Meus protocolos</h2></div><Layers3 size={28} aria-hidden="true"/></div>
        {loading ? <p role="status">Carregando perfil…</p> : error ? <p role="alert">{error}</p> :
          <AssignedProtocols key={athleteId} athleteId={athleteId} />}
      </div>
    </main>
    <BottomNavigation />
  </div>;
}
