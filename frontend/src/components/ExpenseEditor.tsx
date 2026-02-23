import { useState } from "react";
import type { Expense, Category, Household, SplitType } from "../types";
import * as api from "../api";

interface Props {
  expense: Expense | null;
  categories: Category[];
  household: Household;
  currentUserId: string;
  onSaved: () => void;
  onCancel: () => void;
  onDeleted?: () => void;
}

export default function ExpenseEditor({
  expense,
  categories,
  household,
  currentUserId,
  onSaved,
  onCancel,
  onDeleted,
}: Props) {
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description || "");
  const [date, setDate] = useState(
    expense?.date || new Date().toISOString().slice(0, 10)
  );
  const [categoryId, setCategoryId] = useState(expense?.category_id || "");
  const [paidBy, setPaidBy] = useState(expense?.paid_by || currentUserId);
  const [splitType, setSplitType] = useState<SplitType>(
    expense?.split_type || "shared"
  );
  const [notes, setNotes] = useState(expense?.notes || "");
  const [tagsStr, setTagsStr] = useState((expense?.tags || []).join(", "));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    setSaving(true);
    setError("");
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (expense) {
        await api.updateExpense(expense.id, {
          amount: amt,
          description: description.trim(),
          date,
          category_id: categoryId || null,
          paid_by: paidBy,
          split_type: splitType,
          notes: notes || null,
          tags,
        });
      } else {
        await api.createExpense({
          amount: amt,
          description: description.trim(),
          date,
          category_id: categoryId || undefined,
          paid_by: paidBy,
          split_type: splitType,
          notes: notes || undefined,
          tags,
        });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense || !onDeleted) return;
    if (!confirm("Delete this expense?")) return;
    setDeleting(true);
    try {
      await api.deleteExpense(expense.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const splitOptions: { value: SplitType; label: string }[] = [
    { value: "shared", label: "Shared (proportional)" },
    { value: "equal", label: "Equal (50/50)" },
    { value: "personal", label: "Personal" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-100">
          {expense ? "Edit Expense" : "Add Expense"}
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Split Type</label>
          <div className="flex gap-2">
            {splitOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSplitType(opt.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  splitType === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Paid By</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPaidBy(currentUserId)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                paidBy === currentUserId
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Me
            </button>
            {household.user_b_id && household.user_b_id !== currentUserId && (
              <button
                onClick={() => setPaidBy(household.user_b_id!)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  paidBy === household.user_b_id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Partner
              </button>
            )}
            {household.user_a_id !== currentUserId && (
              <button
                onClick={() => setPaidBy(household.user_a_id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  paidBy === household.user_a_id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Partner
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Tags <span className="text-gray-600">(comma separated)</span>
          </label>
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="groceries, monthly"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {saving ? "Saving..." : expense ? "Update" : "Add Expense"}
          </button>
          {expense && onDeleted && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition-colors"
            >
              {deleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
