import { useState, useEffect } from "react";
import type { RecurringExpense, Category, Household, SplitType, Frequency } from "../types";
import * as api from "../api";
import SplitBadge from "./SplitBadge";

interface Props {
  household: Household;
  currentUserId: string;
  categories: Category[];
  onUseTemplate: (r: RecurringExpense) => void;
}

export default function RecurringList({
  household,
  currentUserId,
  categories,
  onUseTemplate,
}: Props) {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("shared");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getRecurring().then(setItems).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setSplitType("shared");
    setFrequency("monthly");
    setDayOfMonth("");
    setEditId(null);
    setShowForm(false);
    setError("");
  };

  const startEdit = (r: RecurringExpense) => {
    setAmount(String(r.amount));
    setDescription(r.description);
    setCategoryId(r.category_id || "");
    setSplitType(r.split_type);
    setFrequency(r.frequency);
    setDayOfMonth(r.day_of_month != null ? String(r.day_of_month) : "");
    setEditId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !description.trim()) {
      setError("Amount and description are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await api.updateRecurring(editId, {
          amount: amt,
          description: description.trim(),
          category_id: categoryId || null,
          split_type: splitType,
          frequency,
          day_of_month: dayOfMonth ? parseInt(dayOfMonth) : null,
        });
      } else {
        await api.createRecurring({
          amount: amt,
          description: description.trim(),
          category_id: categoryId || undefined,
          split_type: splitType,
          frequency,
          day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        });
      }
      resetForm();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring template?")) return;
    try {
      await api.deleteRecurring(id);
      load();
    } catch {
      // ignore
    }
  };

  const handleToggle = async (r: RecurringExpense) => {
    try {
      await api.updateRecurring(r.id, { active: !r.active });
      load();
    } catch {
      // ignore
    }
  };

  const freqLabels: Record<Frequency, string> = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Recurring Templates</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
          >
            + Add Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter mb-6">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
            {editId ? "Edit Template" : "New Template"}
          </h3>
          {error && (
            <div className="text-red-500 text-sm mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="modern-input w-full"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="Optional"
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="modern-input w-full"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Split Type</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
                className="modern-input w-full"
              >
                <option value="shared">Shared</option>
                <option value="equal">Equal (50/50)</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button
              onClick={resetForm}
              className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No recurring templates. Add templates for expenses you pay regularly.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className={`apple-card rounded-2xl shadow-md p-4 card-enter ${
                !r.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {r.description}
                    </span>
                    <SplitBadge type={r.split_type} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {freqLabels[r.frequency]}
                    </span>
                    {r.day_of_month && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Day {r.day_of_month}
                      </span>
                    )}
                    {r.category_name && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {r.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-base font-semibold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                  ${r.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onUseTemplate(r)}
                  className="bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-xs font-medium apple-button shadow-sm"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handleToggle(r)}
                  className="apple-card rounded-full px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm"
                >
                  {r.active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => startEdit(r)}
                  className="apple-card rounded-full px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full px-4 py-2 text-xs font-medium apple-button"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
