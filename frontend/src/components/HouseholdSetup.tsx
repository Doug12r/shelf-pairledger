import { useState } from "react";
import type { Household } from "../types";
import * as api from "../api";

interface Props {
  onDone: (h: Household) => void;
}

export default function HouseholdSetup({ onDone }: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("Our Household");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const h = await api.createHousehold(name);
      onDone(h);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create household");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError("");
    try {
      const h = await api.joinHousehold(code.trim());
      onDone(h);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join household");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="max-w-md mx-auto mt-16 text-center animate-fadeIn">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-sky-500 to-sky-600" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Welcome to PairLedger</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Track shared expenses with your partner using income-proportional splits.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode("create")}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm"
          >
            Create a Household
          </button>
          <button
            onClick={() => setMode("join")}
            className="apple-card rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 apple-button shadow-sm"
          >
            Join with Invite Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 animate-fadeIn">
      <button
        onClick={() => { setMode("choose"); setError(""); }}
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 apple-button font-medium mb-4"
      >
        &larr; Back
      </button>

      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        {mode === "create" ? "Create Your Household" : "Join a Household"}
      </h2>

      {error && (
        <div className="text-red-500 text-sm mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {mode === "create" ? (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Household Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="modern-input w-full"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Household"}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            You'll get an invite code to share with your partner.
          </p>
        </div>
      ) : (
        <div className="apple-card rounded-2xl shadow-md p-6 card-enter space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter invite code"
              className="modern-input w-full"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white px-5 py-3 rounded-xl font-semibold apple-button shadow-sm disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Household"}
          </button>
        </div>
      )}
    </div>
  );
}
