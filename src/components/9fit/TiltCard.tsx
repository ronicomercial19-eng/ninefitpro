import React, { forwardRef } from "react";
import { useTiltCard, TiltCardOptions } from "@/hooks/useTiltCard";

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  options?: TiltCardOptions;
  as?: "div" | "button" | "article" | "section";
  haloColor?: string;
  haloSize?: string;
  maxTilt?: number;
  scale?: number;
  disabled?: boolean;
}

/**
 * TiltCard
 * High-performance 3D tilt card with reactive halo spotlight.
 * Automatically utilizes the `.hub-card-interactive` styling defined in index.css.
 */
export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      children,
      className = "",
      as: Component = "div",
      haloColor,
      haloSize,
      maxTilt,
      scale,
      disabled,
      options,
      ...rest
    },
    forwardedRef
  ) => {
    const tiltRef = useTiltCard<HTMLDivElement>({
      haloColor: haloColor || options?.haloColor,
      haloSize: haloSize || options?.haloSize,
      maxTilt: maxTilt ?? options?.maxTilt,
      scale: scale ?? options?.scale,
      disabled: disabled ?? options?.disabled,
    });

    // Merge internal tiltRef with any forwarded ref
    const setRef = (node: HTMLDivElement | null) => {
      tiltRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    return (
      // @ts-expect-error Component dynamic polymorphism
      <Component
        ref={setRef}
        className={`hub-card-interactive relative transform-gpu ${className}`}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);

TiltCard.displayName = "TiltCard";
