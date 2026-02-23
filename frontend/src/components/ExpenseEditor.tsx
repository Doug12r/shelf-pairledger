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
    <div className="animate-fadeIn max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          {expense ? "Edit Expense" : "Add Expense"}
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 apple-button font-medium"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      <div className="apple-card rounded-2xl shadow-md p-6 card-enter space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="modern-input w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="modern-input w-full"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
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
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Split Type</label>
          <div className="flex gap-2">
            {splitOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSplitType(opt.value)}
                className={
                  splitType === opt.value
                    ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium apple-button shadow-sm flex-1"
                    : "apple-card rounded-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm flex-1"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Paid By</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPaidBy(currentUserId)}
              className={
                paidBy === currentUserId
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium apple-button shadow-sm flex-1"
                  : "apple-card rounded-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm flex-1"
              }
            >
              Me
            </button>
            {household.user_b_id && household.user_b_id !== currentUserId && (
              <button
                onClick={() => setPaidBy(household.user_b_id!)}
                className={
                  paidBy === household.user_b_id
                    ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium apple-button shadow-sm flex-1"
                    : "apple-card rounded-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm flex-1"
                }
              >
                Partner
              </button>
            )}
            {household.user_a_id !== currentUserId && (
              <button
                onClick={() => setPaidBy(household.user_a_id)}
                className={
                  paidBy === household.user_a_id
                    ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium apple-button shadow-sm flex-1"
                    : "apple-card rounded-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 apple-button shadow-sm flex-1"
                }
              >
                Partner
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="modern-input w-full"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
            Tags <span className="text-slate-400 dark:text-slate-500">(comma separated)</span>
          </label>
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="groceries, monthly"
            className="modern-input w-full"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : expense ? "Update" : "Add Expense"}
          </button>
          {expense && onDeleted && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium apple-button"
            >
              {deleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
