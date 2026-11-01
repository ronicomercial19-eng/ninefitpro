import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { RonOpenRequest } from './RonConciergeSheet';

const RonConciergeSheet = lazy(() => import('./RonConciergeSheet').then(module => ({ default: module.RonConciergeSheet })));

// Keep chat queries, calendar and voice initialization out of ordinary navigation.
export function RonBubble() {
  const { pathname } = useLocation();
  const [request, setRequest] = useState<RonOpenRequest | null>(null);
  const active = pathname === '/9fit/ron' || request !== null;
  useEffect(() => {
    const open = (event: Event) => { if (!active) setRequest((event as CustomEvent<RonOpenRequest>).detail || {}); };
    const shortcut = (event: KeyboardEvent) => {
      if (!active && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setRequest({}); }
    };
    window.addEventListener('9fit:open-ron-concierge', open);
    window.addEventListener('keydown', shortcut);
    return () => { window.removeEventListener('9fit:open-ron-concierge', open); window.removeEventListener('keydown', shortcut); };
  }, [active]);
  return active ? <Suspense fallback={<p role="status" className="sr-only">Abrindo RON…</p>}><RonConciergeSheet initialRequest={request} /></Suspense> : null;
}
