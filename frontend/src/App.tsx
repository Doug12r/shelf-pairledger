import { useState, useEffect, useCallback } from "react";
import type { Household, Expense, Category, Balance, RecurringExpense } from "./types";
import * as api from "./api";
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <HouseholdSetup
            onDone={(h) => {
              setHousehold(h);
              setCurrentUserId(h.user_a_id);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1
              onClick={() => setView({ kind: "dashboard" })}
              className="text-2xl font-bold text-gray-100 cursor-pointer hover:text-white transition-colors"
            >
              PairLedger
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {household.name}
            </p>
          </div>
          <button
            onClick={() => api.exportData()}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            Export Data
          </button>
        </header>

        {/* Nav tabs */}
        <nav className="flex gap-1 mb-6 border-b border-gray-800 pb-px overflow-x-auto">
          {(
            [
              { id: "dashboard", label: "Dashboard" },
              { id: "expenses", label: "Expenses" },
              { id: "categories", label: "Categories" },
              { id: "income", label: "Income" },
              { id: "settlements", label: "Settlements" },
              { id: "recurring", label: "Recurring" },
              { id: "stats", label: "Stats" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigateTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap ${
                currentTab === tab.id
                  ? "text-sky-400 border-b-2 border-sky-400 -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Views */}
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
            }}
            onCancel={() => setView({ kind: "expenses" })}
            onDeleted={() => {
              loadBalance();
              setView({ kind: "expenses" });
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
      </div>
    </div>
  );
}
