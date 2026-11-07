import { useEffect } from 'react';

const KEY = 'nine:splash-seen';

/** Splash de marca: uma vez por sessão. Se o storage falhar, não mostra (nunca trava a entrada). */
export function splashSeen() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return true; }
}

export function BrandSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(KEY, '1'); } catch { /* Optional browser storage. */ }
      onDone();
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <button
      type="button"
      aria-label="Entrar no 9FIT PRO"
      onClick={() => { try { sessionStorage.setItem(KEY, '1'); } catch { /* Optional. */ } onDone(); }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#070708] text-white"
    >
      <span className="text-center motion-safe:animate-fade-in">
        <span className="block font-display text-5xl font-black tracking-tight">9<span className="text-primary">FIT</span> PRO</span>
        <span className="mt-3 block text-sm text-neutral-400">Seu treino organizado. Sua evolução registrada.</span>
      </span>
    </button>
  );
}
