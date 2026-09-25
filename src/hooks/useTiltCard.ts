import { useEffect, useRef, useCallback } from "react";

export interface TiltCardOptions {
  maxTilt?: number; // Maximum tilt angle in degrees (default: 5)
  haloColor?: string; // Color of the halo spotlight (default: "rgba(255, 102, 0, 0.22)")
  haloSize?: string; // Radius of the halo spotlight (default: "320px")
  scale?: number; // Scale factor on hover (default: 1.012)
  disabled?: boolean;
}

/**
 * useTiltCard
 * High-performance 3D tilt & cursor-reactive halo hook.
 * Directly manages CSS transforms & variables at 60/120fps without triggering React re-renders.
 */
export function useTiltCard<T extends HTMLElement = HTMLDivElement>(options: TiltCardOptions = {}) {
  const {
    maxTilt = 5.5,
    haloColor = "rgba(255, 102, 0, 0.24)",
    haloSize = "320px",
    scale = 1.012,
    disabled = false,
  } = options;

  const elementRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (disabled || !elementRef.current) return;
      if (e.pointerType === "touch") return; // Touch devices scroll, don't tilt

      const el = elementRef.current;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const xPct = (x / rect.width) * 100;
        const yPct = (y / rect.height) * 100;

        // Normalized relative to center: -0.5 to +0.5
        const normX = x / rect.width - 0.5;
        const normY = y / rect.height - 0.5;

        const rotateX = -normY * maxTilt;
        const rotateY = normX * maxTilt;

        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px) scale3d(${scale}, ${scale}, ${scale})`;
        el.style.setProperty("--halo-x", `${xPct.toFixed(1)}%`);
        el.style.setProperty("--halo-y", `${yPct.toFixed(1)}%`);
        el.style.setProperty("--halo-opacity", "1");
        el.style.setProperty("--halo-color", haloColor);
        el.style.setProperty("--halo-size", haloSize);
      });
    },
    [disabled, maxTilt, scale, haloColor, haloSize]
  );

  const handlePointerEnter = useCallback(
    (e: PointerEvent) => {
      if (disabled || !elementRef.current || e.pointerType === "touch") return;
      const el = elementRef.current;
      el.style.transition = "transform 0.12s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease-out, border-color 0.25s ease-out";
      el.style.setProperty("--halo-opacity", "1");
      el.style.setProperty("--halo-color", haloColor);
      el.style.setProperty("--halo-size", haloSize);
    },
    [disabled, haloColor, haloSize]
  );

  const handlePointerLeave = useCallback(() => {
    if (disabled || !elementRef.current) return;
    const el = elementRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Smooth ease-out reset
    el.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease-out, border-color 0.3s ease-out";
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)";
    el.style.setProperty("--halo-opacity", "0");
  }, [disabled]);

  const handleFocus = useCallback(() => {
    if (disabled || !elementRef.current) return;
    const el = elementRef.current;
    el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease-out";
    el.style.transform = `perspective(1000px) rotateX(1.5deg) rotateY(0deg) translateY(-2px) scale3d(${scale}, ${scale}, ${scale})`;
    el.style.setProperty("--halo-x", "50%");
    el.style.setProperty("--halo-y", "50%");
    el.style.setProperty("--halo-opacity", "1");
    el.style.setProperty("--halo-color", haloColor);
    el.style.setProperty("--halo-size", haloSize);
  }, [disabled, scale, haloColor, haloSize]);

  const handleBlur = useCallback(() => {
    if (disabled || !elementRef.current) return;
    handlePointerLeave();
  }, [disabled, handlePointerLeave]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || disabled) return;

    // Check reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    el.addEventListener("pointerenter", handlePointerEnter);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);
    el.addEventListener("focus", handleFocus, true);
    el.addEventListener("blur", handleBlur, true);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener("pointerenter", handlePointerEnter);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
      el.removeEventListener("focus", handleFocus, true);
      el.removeEventListener("blur", handleBlur, true);
    };
  }, [disabled, handlePointerEnter, handlePointerMove, handlePointerLeave, handleFocus, handleBlur]);

  return elementRef;
}
