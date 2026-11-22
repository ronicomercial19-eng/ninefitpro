import type { ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export function StudentBlockTitle({
  number,
  title,
  description,
  action,
}: {
  number: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 font-mono text-[11px] text-primary"
        >
          {number}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function StudentActionCard({
  icon: Icon,
  title,
  description,
  to,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
  badge?: string;
}) {
  const className =
    "group flex min-h-28 min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-[#121416] p-4 text-left transition-colors hover:border-primary/40 hover:bg-[#181a1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-5";
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
        <Icon size={19} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
        {badge && (
          <span className="mt-2 block text-[10px] font-medium text-primary">
            {badge}
          </span>
        )}
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    </>
  );
  return to ? (
    <Link className={className} to={to}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export function StudentDetailGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-3xl border border-white/10 bg-[#0e1012] p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-primary">
        {title}
        <span className="mt-1 block pl-4 text-xs font-normal leading-relaxed text-muted-foreground">
          {description}
        </span>
      </summary>
      <div className="mt-5 space-y-4">{children}</div>
    </details>
  );
}
