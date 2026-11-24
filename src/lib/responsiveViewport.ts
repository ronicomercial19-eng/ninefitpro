/** Track keyboard/rotation changes only at normal scale. Never reset a user's pinch zoom. */
export function installResponsiveViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const root = document.documentElement;
  const update = () => {
    if (Math.abs(viewport.scale - 1) > 0.01) {
      root.style.removeProperty("--app-visible-height");
      root.style.removeProperty("--app-visible-top");
      return;
    }
    root.style.setProperty("--app-visible-height", `${viewport.height}px`);
    root.style.setProperty("--app-visible-top", `${viewport.offsetTop}px`);
  };
  update();
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  window.addEventListener("pageshow", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
    window.removeEventListener("pageshow", update);
    root.style.removeProperty("--app-visible-height");
    root.style.removeProperty("--app-visible-top");
  };
}
