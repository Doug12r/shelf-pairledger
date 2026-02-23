import type { SplitType } from "../types";

const config: Record<SplitType, { label: string; cls: string }> = {
  shared: { label: "Shared", cls: "bg-blue-500/20 text-blue-400" },
  personal: { label: "Personal", cls: "bg-amber-500/20 text-amber-400" },
  equal: { label: "50/50", cls: "bg-emerald-500/20 text-emerald-400" },
};

export default function SplitBadge({ type }: { type: SplitType }) {
  const c = config[type] || config.shared;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}
