import type { SplitType } from "../types";

const config: Record<SplitType, { label: string; cls: string }> = {
  shared: { label: "Shared", cls: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" },
  personal: { label: "Personal", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
  equal: { label: "50/50", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
};

export default function SplitBadge({ type }: { type: SplitType }) {
  const c = config[type] || config.shared;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}
