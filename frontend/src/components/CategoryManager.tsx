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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Categories</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
          >
            + Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            {editId ? "Edit Category" : "New Category"}
          </h3>
          {error && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. 🛒"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-sm text-gray-400">{color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly Budget</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
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

      {categories.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No categories yet. Add one to organize your expenses.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                {c.color && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                )}
                <span className="text-base">{c.icon || ""}</span>
                <span className="text-sm text-gray-200 truncate">{c.name}</span>
                {c.budget_monthly != null && (
                  <span className="text-xs text-gray-500">
                    ${c.budget_monthly}/mo
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
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
