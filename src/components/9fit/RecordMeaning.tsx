import { ClipboardCheck, Dumbbell, Utensils, Droplets } from "lucide-react";
import type { DailyContext } from "@/services/dailyContextRules";
import { studentEvidence } from "@/lib/studentGuidance";

const icons = {
  checkin: ClipboardCheck,
  training: Dumbbell,
  nutrition: Utensils,
  water: Droplets,
};
export function RecordMeaning({
  context,
}: {
  context: DailyContext | null | undefined;
}) {
  const records = studentEvidence(context);
  if (!records.length) return null;
  return (
    <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4">
      <summary className="min-h-14 cursor-pointer py-4 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-primary">
        Registros de hoje
      </summary>
      <dl className="divide-y divide-white/[0.06] border-t border-white/10 pb-2">
        {records.map((item) => {
          const Icon = icons[item.key];
          return (
            <div
              key={item.key}
              className="flex min-h-12 items-center justify-between gap-3 py-3 text-xs"
            >
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Icon size={15} aria-hidden="true" />
                {item.label}
              </dt>
              <dd
                className={`text-right font-medium tabular-nums ${
                  item.recorded ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}
