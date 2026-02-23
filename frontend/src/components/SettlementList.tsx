import { useState, useEffect } from "react";
import type { Settlement, Balance, Household } from "../types";
import * as api from "../api";

interface Props {
  household: Household;
  currentUserId: string;
  balance: Balance | null;
  onSettled: () => void;
}

export default function SettlementList({
  household,
  currentUserId,
  balance,
  onSettled,
}: Props) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getSettlements().then(setSettlements).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const partnerExists = household.user_b_id != null;
  const partnerId =
    household.user_a_id === currentUserId
      ? household.user_b_id
      : household.user_a_id;

  // Who owes whom based on balance?
  const net = balance?.net_balance || 0;
  const isUserA = currentUserId === household.user_a_id;
  const iOwe = isUserA ? net > 0 : net < 0;
  const absNet = Math.abs(net);

  const startSettle = () => {
    setAmount(absNet.toFixed(2));
    setShowForm(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !partnerId) return;
    setSaving(true);
    setError("");
    try {
      await api.createSettlement({
        from_user: iOwe ? currentUserId : partnerId,
        to_user: iOwe ? partnerId : currentUserId,
        amount: amt,
        date,
        notes: notes || undefined,
      });
      setShowForm(false);
      setAmount("");
      setNotes("");
      load();
      onSettled();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this settlement?")) return;
    try {
      await api.deleteSettlement(id);
      load();
      onSettled();
    } catch {
      // ignore
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Settlements</h2>
        {partnerExists && absNet > 0.01 && !showForm && (
          <button
            onClick={startSettle}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
          >
            Settle Up (${absNet.toFixed(2)})
          </button>
        )}
      </div>

      {showForm && (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter mb-6">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Record Settlement</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {iOwe ? "You pay your partner" : "Your partner pays you"}
          </p>
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
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
              placeholder="Optional"
              className="modern-input w-full"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Record Settlement"}
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

      {settlements.length === 0 ? (
        <div className="apple-card rounded-2xl shadow-md p-12 text-center card-enter">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No settlements recorded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <div
              key={s.id}
              className="apple-card rounded-2xl shadow-md p-4 card-enter flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                    ${s.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {s.from_user === currentUserId ? "You paid partner" : "Partner paid you"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.date}</span>
                  {s.notes && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{s.notes}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium apple-button"
              >
                Del
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
