import { useEffect, useState } from "react";

function isVisibleElement(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

/**
 * Detecta modais/overlays globais abertos para evitar que FABs e bottom nav
 * fiquem por cima do conteúdo essencial em mobile.
 */
export function useBlockingOverlay() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const update = () => {
      const candidates = Array.from(document.body.querySelectorAll<HTMLElement>(
        '[role="dialog"], [aria-modal="true"], .fixed.inset-0'
      ));

      setBlocked(candidates.some((element) => {
        if (element.closest('[data-ron-concierge="true"]')) return false;
        if (!isVisibleElement(element)) return false;
        const className = String(element.className || "");
        const style = window.getComputedStyle(element);
        const zIndex = Number.parseInt(style.zIndex || "0", 10);
        return element.getAttribute("aria-modal") === "true"
          || element.getAttribute("role") === "dialog"
          || className.includes("inset-0")
          || zIndex >= 50;
      }));
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "open", "aria-hidden"] });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return blocked;
}
