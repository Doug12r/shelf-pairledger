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
      className="w-full text-left p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {expense.category_icon && (
              <span className="text-base">{expense.category_icon}</span>
            )}
            <span className="text-sm font-medium text-gray-200 truncate">
              {expense.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">{expense.date}</span>
            <span className="text-xs text-gray-600">&middot;</span>
            <span className={`text-xs ${isYou ? "text-sky-400" : "text-gray-400"}`}>
              {isYou ? "You" : isUserA ? "Partner A" : "Partner B"}
            </span>
            <SplitBadge type={expense.split_type} />
          </div>
          {expense.category_name && (
            <span className="text-xs text-gray-500 mt-1 inline-block">
              {expense.category_name}
            </span>
          )}
        </div>
        <span className="text-base font-semibold tabular-nums text-gray-100 shrink-0">
          ${expense.amount.toFixed(2)}
        </span>
      </div>
      {expense.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {expense.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
