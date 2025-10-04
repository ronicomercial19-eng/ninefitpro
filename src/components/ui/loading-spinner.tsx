import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
  xl: "w-16 h-16 border-4"
};

export function LoadingSpinner({ 
  size = "md", 
  className,
  label 
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizeMap[size],
          className
        )}
        role="status"
        aria-label={label || "Carregando"}
      />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
