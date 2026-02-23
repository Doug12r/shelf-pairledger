import { useState, useEffect } from "react";
import type { Expense, Category, Household } from "../types";
import * as api from "../api";
import ExpenseEntry from "./ExpenseEntry";

interface Props {
  household: Household;
  currentUserId: string;
  categories: Category[];
  onSelect: (expense: Expense) => void;
  onAdd: () => void;
}

export default function ExpenseList({
  household,
  currentUserId,
  categories,
  onSelect,
  onAdd,
}: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPayer, setFilterPayer] = useState("");
  const [filterSplit, setFilterSplit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [y, m] = filterMonth.split("-").map(Number);
    api
      .getExpenses({
        page,
        per_page: perPage,
        year: y || undefined,
        month: m || undefined,
        category_id: filterCategory || undefined,
        paid_by: filterPayer || undefined,
        split_type: filterSplit || undefined,
      })
      .then((res) => {
        setExpenses(res.expenses);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, perPage, filterMonth, filterCategory, filterPayer, filterSplit]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Expenses</h2>
        <button
          onClick={onAdd}
          className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
        >
          + Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => {
            setFilterMonth(e.target.value);
            setPage(1);
          }}
          className="modern-input"
        />
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="modern-input"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}{c.name}
            </option>
          ))}
        </select>
        <select
          value={filterPayer}
          onChange={(e) => {
            setFilterPayer(e.target.value);
            setPage(1);
          }}
          className="modern-input"
        >
          <option value="">All payers</option>
          <option value={currentUserId}>Me</option>
          {household.user_b_id &&
            household.user_b_id !== currentUserId && (
              <option value={household.user_b_id}>Partner</option>
            )}
          {household.user_a_id !== currentUserId && (
            <option value={household.user_a_id}>Partner</option>
          )}
        </select>
        <select
          value={filterSplit}
          onChange={(e) => {
            setFilterSplit(e.target.value);
            setPage(1);
          }}
          className="modern-input"
        >
          <option value="">All splits</option>
          <option value="shared">Shared</option>
          <option value="equal">Equal</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      {loading ? (
        <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No expenses found for this period.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {expenses.map((e) => (
              <ExpenseEntry
                key={e.id}
                expense={e}
                household={household}
                currentUserId={currentUserId}
                onClick={() => onSelect(e)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
