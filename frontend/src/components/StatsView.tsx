import { useState, useEffect } from "react";
import type { CategorySpending, MonthlyTrend } from "../types";
import * as api from "../api";

export default function StatsView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [catStats, setCatStats] = useState<CategorySpending[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);

  useEffect(() => {
    api.getCategoryStats(year, month).then(setCatStats).catch(() => {});
    api.getTrends(12).then(setTrends).catch(() => {});
  }, [year, month]);

  const maxCatTotal = Math.max(...catStats.map((c) => c.total), 1);
  const maxTrend = Math.max(...trends.map((t) => t.total), 1);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100">Spending Stats</h2>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">By Category</h3>
          {catStats.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No spending data for this period.
            </p>
          ) : (
            <div className="space-y-3">
              {catStats.map((c) => (
                <div key={c.category_id ?? "none"}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{c.category_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 tabular-nums font-medium">
                        ${c.total.toFixed(2)}
                      </span>
                      {c.budget != null && (
                        <span
                          className={`text-xs ${
                            c.total > c.budget ? "text-red-400" : "text-gray-500"
                          }`}
                        >
                          / ${c.budget.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    {c.budget != null ? (
                      <div
                        className={`h-full rounded-full ${
                          c.total > c.budget ? "bg-red-500" : "bg-sky-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (c.total / c.budget) * 100)}%`,
                        }}
                      />
                    ) : (
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{
                          width: `${(c.total / maxCatTotal) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {c.count} expense{c.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly trends */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Monthly Trends</h3>
        {trends.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No trend data yet.</p>
        ) : (
          <div className="space-y-2">
            {trends.map((t) => (
              <div key={t.month}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{t.month}</span>
                  <span className="text-gray-200 tabular-nums">
                    ${t.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${(t.shared / maxTrend) * 100}%` }}
                    title={`Shared: $${t.shared.toFixed(2)}`}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(t.personal / maxTrend) * 100}%` }}
                    title={`Personal: $${t.personal.toFixed(2)}`}
                  />
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${((t.total - t.shared - t.personal) / maxTrend) * 100}%`,
                    }}
                    title={`Equal: $${(t.total - t.shared - t.personal).toFixed(2)}`}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-500">Shared</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-500">Personal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500">Equal</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
