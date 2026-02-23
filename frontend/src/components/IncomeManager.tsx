import { useState, useEffect } from "react";
import type { Income, SplitRatio, Household } from "../types";
import * as api from "../api";

interface Props {
  household: Household;
  currentUserId: string;
}

export default function IncomeManager({ household, currentUserId }: Props) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [ratio, setRatio] = useState<SplitRatio | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getIncomes().then(setIncomes).catch(() => {});
    api.getSplitRatio().then(setRatio).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createIncome({
        amount: amt,
        effective_from: effectiveFrom,
        notes: notes || undefined,
      });
      setShowForm(false);
      setAmount("");
      setNotes("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income entry?")) return;
    try {
      await api.deleteIncome(id);
      load();
    } catch {
      // ignore
    }
  };

  const myIncomes = incomes.filter((i) => i.user_id === currentUserId);
  const partnerIncomes = incomes.filter((i) => i.user_id !== currentUserId);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Income & Split Ratio</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
          >
            + Set Income
          </button>
        )}
      </div>

      {/* Split ratio display */}
      {ratio && (
        <div className="apple-card rounded-2xl shadow-md p-4 card-enter mb-6">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 block">Current Split Ratio</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-800 dark:text-gray-100">
                  {ratio.user_a_id === currentUserId ? "You" : "Partner"}
                </span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {(ratio.user_a_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full"
                  style={{ width: `${ratio.user_a_ratio * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                ${ratio.user_a_income.toFixed(0)}/mo
              </p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-800 dark:text-gray-100">
                  {ratio.user_b_id === currentUserId ? "You" : "Partner"}
                </span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {(ratio.user_b_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${ratio.user_b_ratio * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                ${ratio.user_b_income.toFixed(0)}/mo
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter mb-6">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Set Your Income</h3>
          {error && (
            <div className="text-red-500 text-sm mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Monthly Income</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000.00"
                className="modern-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Effective From</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="modern-input w-full"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="modern-input w-full"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Income history */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Your Income History</h3>
          {myIncomes.length === 0 ? (
            <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
              <p className="text-xs text-slate-500 dark:text-slate-400">No income set yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myIncomes.map((inc) => (
                <div
                  key={inc.id}
                  className="apple-card rounded-2xl shadow-md p-4 card-enter flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                      ${inc.amount.toFixed(2)}/mo
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      from {inc.effective_from}
                    </span>
                    {inc.notes && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{inc.notes}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(inc.id)}
                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium apple-button"
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {household.user_b_id && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Partner's Income History</h3>
            {partnerIncomes.length === 0 ? (
              <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
                <p className="text-xs text-slate-500 dark:text-slate-400">Partner hasn't set their income yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {partnerIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="apple-card rounded-2xl shadow-md p-4 card-enter flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                        ${inc.amount.toFixed(2)}/mo
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                        from {inc.effective_from}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
