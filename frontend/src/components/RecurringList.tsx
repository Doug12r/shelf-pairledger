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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Recurring Templates</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
          >
            + Add Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            {editId ? "Edit Template" : "New Template"}
          </h3>
          {error && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
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
              <label className="block text-xs text-gray-500 mb-1">Split Type</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              >
                <option value="shared">Shared</option>
                <option value="equal">Equal (50/50)</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No recurring templates. Add templates for expenses you pay regularly.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className={`p-3 rounded-lg bg-gray-900 border border-gray-800 ${
                !r.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">
                      {r.description}
                    </span>
                    <SplitBadge type={r.split_type} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {freqLabels[r.frequency]}
                    </span>
                    {r.day_of_month && (
                      <span className="text-xs text-gray-600">
                        Day {r.day_of_month}
                      </span>
                    )}
                    {r.category_name && (
                      <span className="text-xs text-gray-500">
                        {r.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-base font-semibold text-gray-100 tabular-nums shrink-0">
                  ${r.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onUseTemplate(r)}
                  className="text-xs px-2 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 transition-colors"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handleToggle(r)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                >
                  {r.active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => startEdit(r)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors"
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
