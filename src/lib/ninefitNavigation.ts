import type { NavigateFunction } from 'react-router-dom';

export function goBackOrHome(navigate: NavigateFunction, fallback = '/9fit/hub') {
  // `history.length` also counts pages outside FitPro (for example WhatsApp).
  if (Number(window.history.state?.idx) > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}
