import { Crown, Activity, Zap, Apple, Users, Diamond, ShieldCheck, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';

// Simplified UI components based on the dump
export const Card = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-brand-surface border border-brand-border rounded-[2rem] p-6 ${className} ${onClick ? 'cursor-pointer' : ''}`}>
    {children}
  </div>
);

export const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-4 mb-6 px-1">
    <div className="h-px w-6 bg-brand-orange" />
    <span className="font-mono text-[10px] font-black uppercase tracking-[0.45em] text-brand-orange">{label}</span>
  </div>
);

// Main Prime component extracted/adapted from the dump
export function PrimePassHub() {
  const [activeSubApp, setActiveSubApp] = useState<'elite' | 'bio' | 'kitchen' | 'recovery' | null>(null);

  const features = [
    { id: 'nutrition', name: 'Bio-Nutrição', description: 'Protocolos de macros e timing.', icon: <Apple size={20} />, color: 'bg-orange-500/10 text-orange-500' },
    { id: 'routines', name: 'Elite Routines', description: 'Ciclos de sono e performance.', icon: <Zap size={20} />, color: 'bg-yellow-500/10 text-yellow-500' },
    { id: 'habits', name: 'Métricas Reais', description: 'Dados de força e resistência.', icon: <Activity size={20} />, color: 'bg-blue-500/10 text-blue-500' },
  ];

  return (
    <div className="space-y-8">
      <Card className="p-8 border border-brand-orange/40">
        <h1 className="font-display font-black text-4xl tracking-tight uppercase italic text-brand-white">
          9FIT <span className="text-brand-orange">PRIME</span>
        </h1>
        <p className="text-xs text-brand-white-dim mt-2">Ative seu protocolo de elite.</p>
      </Card>

      <section className="space-y-4">
        <SectionLabel label="Arsenal Prime" />
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.id} onClick={() => setActiveSubApp(feature.id as any)} className="p-4 hover:border-brand-orange/30 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${feature.color} mb-3`}>
                {feature.icon}
              </div>
              <h4 className="font-black text-sm uppercase">{feature.name}</h4>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
