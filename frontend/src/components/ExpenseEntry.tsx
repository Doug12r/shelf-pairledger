import type { Expense, Household } from "../types";
import SplitBadge from "./SplitBadge";

interface Props {
  expense: Expense;
  household: Household;
  currentUserId: string;
  onClick: () => void;
}

export default function ExpenseEntry({ expense, household, currentUserId, onClick }: Props) {
  const isYou = expense.paid_by === currentUserId;
  const isUserA = expense.paid_by === household.user_a_id;

  return (
    <button
      onClick={onClick}
      className="w-full text-left apple-card rounded-2xl shadow-md p-4 card-enter apple-button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {expense.category_icon && (
              <span className="text-base">{expense.category_icon}</span>
            )}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {expense.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{expense.date}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">&middot;</span>
            <span className={`text-xs ${isYou ? "text-sky-600 dark:text-sky-400" : "text-slate-500 dark:text-slate-400"}`}>
              {isYou ? "You" : isUserA ? "Partner A" : "Partner B"}
            </span>
            <SplitBadge type={expense.split_type} />
          </div>
          {expense.category_name && (
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-block">
              {expense.category_name}
            </span>
          )}
        </div>
        <span className="text-base font-semibold tabular-nums text-sky-600 dark:text-sky-400 shrink-0">
          ${expense.amount.toFixed(2)}
        </span>
      </div>
      {expense.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {expense.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
