import type {
  Household,
  Income,
  SplitRatio,
  Category,
  Expense,
  ExpenseListResponse,
  Settlement,
  RecurringExpense,
  Balance,
  MonthlySummary,
  CategorySpending,
  MonthlyTrend,
  SearchResult,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Household
export const getHousehold = () => request<Household>("/household");
export const createHousehold = (name?: string) =>
  request<Household>("/household", {
    method: "POST",
    body: JSON.stringify({ name: name || "Our Household" }),
  });
export const joinHousehold = (invite_code: string) =>
  request<Household>("/household/join", {
    method: "POST",
    body: JSON.stringify({ invite_code }),
  });
export const updateHousehold = (name: string) =>
  request<Household>("/household", {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
export const regenerateInvite = () =>
  request<Household>("/household/regenerate-invite", { method: "POST" });

// Income
export const getIncomes = () => request<Income[]>("/incomes");
export const createIncome = (data: {
  amount: number;
  effective_from: string;
  notes?: string;
}) => request<Income>("/incomes", { method: "POST", body: JSON.stringify(data) });
export const deleteIncome = (id: string) =>
  request<void>(`/incomes/${id}`, { method: "DELETE" });
export const getSplitRatio = () => request<SplitRatio>("/incomes/split-ratio");

// Categories
export const getCategories = () => request<Category[]>("/categories");
export const createCategory = (data: {
  name: string;
  icon?: string;
  color?: string;
  budget_monthly?: number;
}) =>
  request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateCategory = (id: string, data: Record<string, unknown>) =>
  request<Category>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteCategory = (id: string) =>
  request<void>(`/categories/${id}`, { method: "DELETE" });

// Expenses
export const getExpenses = (params?: {
  page?: number;
  per_page?: number;
  year?: number;
  month?: number;
  category_id?: string;
  paid_by?: string;
  split_type?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.year) qs.set("year", String(params.year));
  if (params?.month) qs.set("month", String(params.month));
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.paid_by) qs.set("paid_by", params.paid_by);
  if (params?.split_type) qs.set("split_type", params.split_type);
  return request<ExpenseListResponse>(`/expenses?${qs}`);
};
export const getExpense = (id: string) => request<Expense>(`/expenses/${id}`);
export const createExpense = (data: {
  amount: number;
  description: string;
  date?: string;
  category_id?: string;
  paid_by?: string;
  split_type?: string;
  notes?: string;
  tags?: string[];
}) =>
  request<Expense>("/expenses", { method: "POST", body: JSON.stringify(data) });
export const updateExpense = (id: string, data: Record<string, unknown>) =>
  request<Expense>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteExpense = (id: string) =>
  request<void>(`/expenses/${id}`, { method: "DELETE" });

// Settlements
export const getSettlements = () => request<Settlement[]>("/settlements");
export const createSettlement = (data: {
  from_user: string;
  to_user: string;
  amount: number;
  date?: string;
  notes?: string;
}) =>
  request<Settlement>("/settlements", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const deleteSettlement = (id: string) =>
  request<void>(`/settlements/${id}`, { method: "DELETE" });

// Recurring
export const getRecurring = () => request<RecurringExpense[]>("/recurring");
export const createRecurring = (data: {
  amount: number;
  description: string;
  paid_by?: string;
  category_id?: string;
  split_type?: string;
  frequency?: string;
  day_of_month?: number;
}) =>
  request<RecurringExpense>("/recurring", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateRecurring = (id: string, data: Record<string, unknown>) =>
  request<RecurringExpense>(`/recurring/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteRecurring = (id: string) =>
  request<void>(`/recurring/${id}`, { method: "DELETE" });

// Balance & Stats
export const getBalance = () => request<Balance>("/balance");
export const getMonthlyStats = (year: number, month: number) =>
  request<MonthlySummary>(`/stats/monthly?year=${year}&month=${month}`);
export const getCategoryStats = (year?: number, month?: number) => {
  const qs = new URLSearchParams();
  if (year) qs.set("year", String(year));
  if (month) qs.set("month", String(month));
  return request<CategorySpending[]>(`/stats/categories?${qs}`);
};
export const getTrends = (months?: number) =>
  request<MonthlyTrend[]>(`/stats/trends?months=${months || 12}`);

// Search & Tags
export const search = (q: string) =>
  request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`);
export const getTags = () => request<string[]>("/tags");

// Export
export const exportData = () => {
  window.open(`${BASE}/export`, "_blank");
};
