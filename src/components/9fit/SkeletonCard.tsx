import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "training" | "stats" | "profile";
}

export function SkeletonCard({ className, variant = "default" }: SkeletonCardProps) {
  if (variant === "training") {
    return (
      <div className={cn("bg-card border border-border rounded-sm p-4 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-muted rounded animate-shimmer w-1/3" />
          <div className="h-4 bg-muted rounded animate-shimmer w-16" />
        </div>
        <div className="h-3 bg-muted rounded animate-shimmer w-2/3" />
        <div className="flex gap-2">
          <div className="h-6 bg-muted rounded animate-shimmer w-16" />
          <div className="h-6 bg-muted rounded animate-shimmer w-20" />
        </div>
        <div className="h-10 bg-muted rounded animate-shimmer w-full" />
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className={cn("bg-card border border-border rounded-sm p-4", className)}>
        <div className="h-5 w-5 bg-muted rounded animate-shimmer mb-2" />
        <div className="h-8 bg-muted rounded animate-shimmer w-1/2 mb-1" />
        <div className="h-3 bg-muted rounded animate-shimmer w-2/3" />
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className={cn("bg-card border border-border rounded-sm p-6", className)}>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-muted rounded-sm animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded animate-shimmer w-1/2" />
            <div className="h-3 bg-muted rounded animate-shimmer w-2/3" />
            <div className="flex gap-4 mt-3">
              <div className="h-8 bg-muted rounded animate-shimmer w-16" />
              <div className="h-8 bg-muted rounded animate-shimmer w-16" />
              <div className="h-8 bg-muted rounded animate-shimmer w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded-sm p-4 animate-shimmer", className)}>
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}
