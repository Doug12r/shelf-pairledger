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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Settlements</h2>
        {partnerExists && absNet > 0.01 && !showForm && (
          <button
            onClick={startSettle}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Settle Up (${absNet.toFixed(2)})
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Record Settlement</h3>
          <p className="text-xs text-gray-500 mb-3">
            {iOwe ? "You pay your partner" : "Your partner pays you"}
          </p>
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
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
              placeholder="Optional"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : "Record Settlement"}
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

      {settlements.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No settlements recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                    ${s.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {s.from_user === currentUserId ? "You paid partner" : "Partner paid you"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{s.date}</span>
                  {s.notes && (
                    <span className="text-xs text-gray-600">{s.notes}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors"
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
