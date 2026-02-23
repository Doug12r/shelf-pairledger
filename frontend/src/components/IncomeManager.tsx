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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Income & Split Ratio</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
          >
            + Set Income
          </button>
        )}
      </div>

      {/* Split ratio display */}
      {ratio && (
        <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Current Split Ratio</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">
                  {ratio.user_a_id === currentUserId ? "You" : "Partner"}
                </span>
                <span className="text-gray-400 tabular-nums">
                  {(ratio.user_a_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${ratio.user_a_ratio * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 tabular-nums">
                ${ratio.user_a_income.toFixed(0)}/mo
              </p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">
                  {ratio.user_b_id === currentUserId ? "You" : "Partner"}
                </span>
                <span className="text-gray-400 tabular-nums">
                  {(ratio.user_b_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${ratio.user_b_ratio * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 tabular-nums">
                ${ratio.user_b_income.toFixed(0)}/mo
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Set Your Income</h3>
          {error && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly Income</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Effective From</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Income history */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Your Income History</h3>
          {myIncomes.length === 0 ? (
            <p className="text-xs text-gray-500">No income set yet.</p>
          ) : (
            <div className="space-y-1">
              {myIncomes.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-200 tabular-nums">
                      ${inc.amount.toFixed(2)}/mo
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      from {inc.effective_from}
                    </span>
                    {inc.notes && (
                      <span className="text-xs text-gray-600 ml-2">{inc.notes}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(inc.id)}
                    className="text-xs px-2 py-1 rounded bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors"
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
            <h3 className="text-sm font-medium text-gray-400 mb-2">Partner's Income History</h3>
            {partnerIncomes.length === 0 ? (
              <p className="text-xs text-gray-500">Partner hasn't set their income yet.</p>
            ) : (
              <div className="space-y-1">
                {partnerIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-200 tabular-nums">
                        ${inc.amount.toFixed(2)}/mo
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
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
