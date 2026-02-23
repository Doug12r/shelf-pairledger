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
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Welcome to PairLedger</h2>
        <p className="text-gray-400 mb-8">
          Track shared expenses with your partner using income-proportional splits.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode("create")}
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Create a Household
          </button>
          <button
            onClick={() => setMode("join")}
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition-colors"
          >
            Join with Invite Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <button
        onClick={() => { setMode("choose"); setError(""); }}
        className="text-sm text-gray-500 hover:text-gray-300 mb-4"
      >
        &larr; Back
      </button>

      <h2 className="text-xl font-bold text-gray-100 mb-6">
        {mode === "create" ? "Create Your Household" : "Join a Household"}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {mode === "create" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Household Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? "Creating..." : "Create Household"}
          </button>
          <p className="text-xs text-gray-500 text-center">
            You'll get an invite code to share with your partner.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? "Joining..." : "Join Household"}
          </button>
        </div>
      )}
    </div>
  );
}
