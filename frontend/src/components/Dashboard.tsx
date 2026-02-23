import { useState, useEffect } from "react";
import type { Expense, Balance, Household, Category, SplitRatio } from "../types";
import * as api from "../api";
import BalanceCard from "./BalanceCard";
import ExpenseEntry from "./ExpenseEntry";
import SearchBar from "./SearchBar";

interface Props {
  household: Household;
  currentUserId: string;
  categories: Category[];
  onAddExpense: () => void;
  onSelectExpense: (expense: Expense) => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({
  household,
  currentUserId,
  categories,
  onAddExpense,
  onSelectExpense,
  onNavigate,
}: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [ratio, setRatio] = useState<SplitRatio | null>(null);
  const [monthTotal, setMonthTotal] = useState(0);

  const load = () => {
    api.getBalance().then(setBalance).catch(() => {});
    api
      .getExpenses({ per_page: 5 })
      .then((res) => setRecent(res.expenses))
      .catch(() => {});
    api.getSplitRatio().then(setRatio).catch(() => {});
    const now = new Date();
    api
      .getMonthlyStats(now.getFullYear(), now.getMonth() + 1)
      .then((s) => setMonthTotal(s.total_spent))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Search */}
      <SearchBar onSelect={(id) => {
        api.getExpense(id).then(onSelectExpense).catch(() => {});
      }} />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-4">
        {balance && (
          <BalanceCard
            balance={balance}
            household={household}
            currentUserId={currentUserId}
          />
        )}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">This Month</h3>
          <p className="text-3xl font-bold tabular-nums text-gray-100">
            ${monthTotal.toFixed(2)}
          </p>
          {ratio && household.user_b_id && (
            <div className="mt-3 flex items-center gap-1">
              <span className="text-xs text-gray-500">Split ratio:</span>
              <span className="text-xs text-sky-400 tabular-nums">
                {(ratio.user_a_ratio * 100).toFixed(0)}
              </span>
              <span className="text-xs text-gray-600">/</span>
              <span className="text-xs text-emerald-400 tabular-nums">
                {(ratio.user_b_ratio * 100).toFixed(0)}
              </span>
            </div>
          )}
          {!household.user_b_id && (
            <p className="text-xs text-gray-500 mt-3">
              Invite your partner to start splitting expenses.
            </p>
          )}
        </div>
      </div>

      {/* Invite code */}
      {!household.user_b_id && household.invite_code && (
        <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-4">
          <p className="text-sm text-sky-300">
            Share this invite code with your partner:
          </p>
          <p className="text-xl font-mono font-bold text-sky-400 mt-1 tracking-wider">
            {household.invite_code}
          </p>
        </div>
      )}

      {/* Quick add + recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Recent Expenses</h3>
          <div className="flex gap-2">
            <button
              onClick={onAddExpense}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
            >
              + Add Expense
            </button>
            <button
              onClick={() => onNavigate("expenses")}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              View all
            </button>
          </div>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            No expenses yet. Add your first expense to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((e) => (
              <ExpenseEntry
                key={e.id}
                expense={e}
                household={household}
                currentUserId={currentUserId}
                onClick={() => onSelectExpense(e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
