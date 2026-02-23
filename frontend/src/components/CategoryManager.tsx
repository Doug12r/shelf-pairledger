import { useState } from "react";
import type { Category } from "../types";
import * as api from "../api";

interface Props {
  categories: Category[];
  onUpdated: () => void;
}

export default function CategoryManager({ categories, onUpdated }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setIcon("");
    setColor("#6366f1");
    setBudget("");
    setEditId(null);
    setShowForm(false);
    setError("");
  };

  const startEdit = (c: Category) => {
    setName(c.name);
    setIcon(c.icon || "");
    setColor(c.color || "#6366f1");
    setBudget(c.budget_monthly != null ? String(c.budget_monthly) : "");
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      icon: icon || null,
      color: color || null,
      budget_monthly: budget ? parseFloat(budget) : null,
    };
    try {
      if (editId) {
        await api.updateCategory(editId, payload);
      } else {
        await api.createCategory(payload as { name: string; icon?: string; color?: string; budget_monthly?: number });
      }
      resetForm();
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.deleteCategory(id);
      onUpdated();
    } catch {
      // ignore
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Categories</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
          >
            + Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter mb-6">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
            {editId ? "Edit Category" : "New Category"}
          </h3>
          {error && (
            <div className="text-red-500 text-sm mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Icon (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. \uD83D\uDED2"
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent cursor-pointer"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">{color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Monthly Budget</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Optional"
                className="modern-input w-full"
              />
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

      {categories.length === 0 ? (
        <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No categories yet. Add one to organize your expenses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="apple-card rounded-2xl shadow-md p-4 card-enter flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                {c.color && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                )}
                <span className="text-base">{c.icon || ""}</span>
                <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{c.name}</span>
                {c.budget_monthly != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ${c.budget_monthly}/mo
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium apple-button"
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
