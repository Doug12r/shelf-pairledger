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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Expenses</h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
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
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
        />
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
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
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
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
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
        >
          <option value="">All splits</option>
          <option value="shared">Shared</option>
          <option value="equal">Equal</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading...</p>
      ) : expenses.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">
          No expenses found for this period.
        </p>
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
                className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
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
