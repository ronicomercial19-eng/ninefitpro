import { flushSync } from "react-dom";

export function runNineCoreTransition(kind: "module" | "student", update: () => void) {
  if (!document.startViewTransition || !matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    update();
    return;
  }
  const root = document.documentElement;
  if (root.dataset.nineCoreTransition) {
    update();
    return;
  }
  root.dataset.nineCoreTransition = kind;
  const transition = document.startViewTransition(() => flushSync(update));
  const clear = () => { delete root.dataset.nineCoreTransition; };
  void transition.finished.then(clear, clear);
}
