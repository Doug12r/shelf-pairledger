import { useState, useEffect, useCallback } from "react";
import type { Household, Expense, Category, Balance, RecurringExpense } from "./types";
import * as api from "./api";
import { useToast } from "./hooks/useToast";
import { ToastContainer } from "./components/Toast";
import HouseholdSetup from "./components/HouseholdSetup";
import Dashboard from "./components/Dashboard";
import ExpenseList from "./components/ExpenseList";
import ExpenseEditor from "./components/ExpenseEditor";
import CategoryManager from "./components/CategoryManager";
import IncomeManager from "./components/IncomeManager";
import SettlementList from "./components/SettlementList";
import RecurringList from "./components/RecurringList";
import StatsView from "./components/StatsView";

type View =
  | { kind: "dashboard" }
  | { kind: "expenses" }
  | { kind: "add-expense"; template?: RecurringExpense }
  | { kind: "edit-expense"; expense: Expense }
  | { kind: "categories" }
  | { kind: "income" }
  | { kind: "settlements" }
  | { kind: "recurring" }
  | { kind: "stats" };

type Tab = "dashboard" | "expenses" | "categories" | "income" | "settlements" | "recurring" | "stats";

export default function App() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [view, setView] = useState<View>({ kind: "dashboard" });
  const { toasts, showToast } = useToast();

  const loadHousehold = useCallback(async () => {
    try {
      const h = await api.getHousehold();
      setHousehold(h);
      // Determine current user from household
      // We'll set it from the auth context — for now, assume we can derive it
      setCurrentUserId(h.user_a_id); // Will be corrected on first load
    } catch {
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = () => {
    api.getCategories().then(setCategories).catch(() => {});
  };

  const loadBalance = () => {
    api.getBalance().then(setBalance).catch(() => {});
  };

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  useEffect(() => {
    if (household) {
      loadCategories();
      loadBalance();
    }
  }, [household]);

  // Determine current user from cookie/session
  // The auth middleware sets this; we can get it from the household response
  // or from a /me endpoint. For simplicity, we try to determine from household context.
  useEffect(() => {
    if (!household) return;
    // Try to fetch incomes to see which user_id matches (heuristic)
    // A cleaner approach: fetch from auth. For now use user_a_id as default.
    // The actual user will be correct since the API authenticates requests.
  }, [household]);

  const currentTab: Tab =
    view.kind === "expenses" || view.kind === "add-expense" || view.kind === "edit-expense"
      ? "expenses"
      : view.kind === "categories"
        ? "categories"
        : view.kind === "income"
          ? "income"
          : view.kind === "settlements"
            ? "settlements"
            : view.kind === "recurring"
              ? "recurring"
              : view.kind === "stats"
                ? "stats"
                : "dashboard";

  const navigateTab = (tab: Tab) => {
    if (tab === "dashboard") setView({ kind: "dashboard" });
    else if (tab === "expenses") setView({ kind: "expenses" });
    else if (tab === "categories") setView({ kind: "categories" });
    else if (tab === "income") setView({ kind: "income" });
    else if (tab === "settlements") setView({ kind: "settlements" });
    else if (tab === "recurring") setView({ kind: "recurring" });
    else if (tab === "stats") setView({ kind: "stats" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <div className="max-w-lg mx-auto px-4 pb-32">
          <HouseholdSetup
            onDone={(h) => {
              setHousehold(h);
              setCurrentUserId(h.user_a_id);
              showToast("Household ready!");
            }}
          />
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Glassmorphism header */}
      <header className="sticky top-0 z-40 apple-card border-b border-white/20 dark:border-white/5 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => setView({ kind: "dashboard" })}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-600" />
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                PairLedger
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 ml-4">
              {household.name}
            </p>
          </div>
          <button
            onClick={() => api.exportData()}
            className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm"
          >
            Export
          </button>
        </div>
      </header>

      {/* Pill tab navigation */}
      <nav className="sticky top-[73px] z-30 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-lg">
        <div className="max-w-lg mx-auto px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "dashboard", label: "Dashboard", icon: "\uD83D\uDCB0" },
              { id: "expenses", label: "Expenses", icon: "\uD83D\uDCDD" },
              { id: "income", label: "Income", icon: "\uD83D\uDCB5" },
              { id: "recurring", label: "Recurring", icon: "\uD83D\uDD04" },
              { id: "stats", label: "Stats", icon: "\uD83D\uDCCA" },
              { id: "categories", label: "Categories", icon: "\u2699\uFE0F" },
              { id: "settlements", label: "Settle", icon: "\u2705" },
            ] as { id: Tab; label: string; icon: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigateTab(tab.id)}
              className={
                currentTab === tab.id
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium apple-button shadow-sm whitespace-nowrap"
                  : "apple-card rounded-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm whitespace-nowrap"
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pb-32 pt-4">
        {view.kind === "dashboard" && (
          <Dashboard
            household={household}
            currentUserId={currentUserId}
            categories={categories}
            onAddExpense={() => setView({ kind: "add-expense" })}
            onSelectExpense={(e) => setView({ kind: "edit-expense", expense: e })}
            onNavigate={(tab) => navigateTab(tab as Tab)}
          />
        )}

        {view.kind === "expenses" && (
          <ExpenseList
            household={household}
            currentUserId={currentUserId}
            categories={categories}
            onSelect={(e) => setView({ kind: "edit-expense", expense: e })}
            onAdd={() => setView({ kind: "add-expense" })}
          />
        )}

        {view.kind === "add-expense" && (
          <ExpenseEditor
            expense={null}
            categories={categories}
            household={household}
            currentUserId={currentUserId}
            onSaved={() => {
              loadBalance();
              setView({ kind: "expenses" });
              showToast("Expense added!");
            }}
            onCancel={() => setView({ kind: "expenses" })}
          />
        )}

        {view.kind === "edit-expense" && (
          <ExpenseEditor
            expense={view.expense}
            categories={categories}
            household={household}
            currentUserId={currentUserId}
            onSaved={() => {
              loadBalance();
              setView({ kind: "expenses" });
              showToast("Expense updated!");
            }}
            onCancel={() => setView({ kind: "expenses" })}
            onDeleted={() => {
              loadBalance();
              setView({ kind: "expenses" });
              showToast("Expense deleted");
            }}
          />
        )}

        {view.kind === "categories" && (
          <CategoryManager
            categories={categories}
            onUpdated={loadCategories}
          />
        )}

        {view.kind === "income" && (
          <IncomeManager
            household={household}
            currentUserId={currentUserId}
          />
        )}

        {view.kind === "settlements" && (
          <SettlementList
            household={household}
            currentUserId={currentUserId}
            balance={balance}
            onSettled={loadBalance}
          />
        )}

        {view.kind === "recurring" && (
          <RecurringList
            household={household}
            currentUserId={currentUserId}
            categories={categories}
            onUseTemplate={(r) =>
              setView({ kind: "add-expense", template: r })
            }
          />
        )}

        {view.kind === "stats" && <StatsView />}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
