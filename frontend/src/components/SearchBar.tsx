import { useState } from "react";
import type { SearchResult } from "../types";
import * as api from "../api";

interface Props {
  onSelect: (expenseId: string) => void;
}

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  const doSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      const r = await api.search(q);
      setResults(r);
      setOpen(true);
    } catch {
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => doSearch(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search expenses..."
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-600"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => {
                onSelect(r.id);
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-200">{r.description}</span>
                <span className="text-sm font-medium text-gray-300 tabular-nums">
                  ${r.amount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{r.date}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
