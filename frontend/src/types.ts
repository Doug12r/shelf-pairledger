export type SplitType = "shared" | "personal" | "equal";
export type Frequency = "weekly" | "biweekly" | "monthly" | "yearly";

export interface Household {
  id: string;
  name: string;
  invite_code: string | null;
  user_a_id: string;
  user_b_id: string | null;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  effective_from: string;
  notes: string | null;
  created_at: string;
}

export interface SplitRatio {
  user_a_id: string;
  user_a_income: number;
  user_a_ratio: number;
  user_b_id: string | null;
  user_b_income: number;
  user_b_ratio: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budget_monthly: number | null;
  created_at: string;
}

export interface Expense {
  id: string;
  paid_by: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  amount: number;
  description: string;
  date: string;
  split_type: SplitType;
  notes: string | null;
  tags: string[];
  receipt_url: string | null;
  created_at: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
}

export interface Settlement {
  id: string;
  from_user: string;
  to_user: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  paid_by: string;
  category_id: string | null;
  category_name: string | null;
  amount: number;
  description: string;
  split_type: SplitType;
  frequency: Frequency;
  day_of_month: number | null;
  active: boolean;
  created_at: string;
}

export interface Balance {
  user_a_id: string;
  user_b_id: string | null;
  user_a_paid: number;
  user_b_paid: number;
  user_a_fair_share: number;
  user_b_fair_share: number;
  net_balance: number;
  settlements_total: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_spent: number;
  shared_total: number;
  personal_total: number;
  equal_total: number;
  user_a_paid: number;
  user_b_paid: number;
  by_category: { category_id: string | null; name: string; total: number }[];
}

export interface CategorySpending {
  category_id: string | null;
  category_name: string;
  total: number;
  count: number;
  budget: number | null;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  shared: number;
  personal: number;
}

export interface SearchResult {
  id: string;
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  snippet: string;
}
