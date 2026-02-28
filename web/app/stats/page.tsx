"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Scope = "career" | "season" | "game";
type Category = "passing" | "rushing" | "receiving";

interface LeaderRow {
  player_id: string;
  player_name: string;
  yds: number;
  td: number;
  [key: string]: unknown;
}

export default function StatsPage() {
  const [scope, setScope] = useState<Scope>("career");
  const [category, setCategory] = useState<Category>("passing");
  const [data, setData] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaders?scope=${scope}&category=${category}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [scope, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-heading text-3xl font-bold text-gold">
        LEADERBOARDS
      </h1>

      {/* Scope Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-smoke p-1">
        {(["career", "season", "game"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`flex-1 rounded-md px-3 py-2 font-heading text-sm font-bold uppercase transition-colors ${
              scope === s
                ? "bg-panel text-gold"
                : "text-dim hover:text-text"
            }`}
          >
            {s === "game" ? "Single Game" : s}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="mb-6 flex gap-2">
        {(["passing", "rushing", "receiving"] as Category[]).map((c) => {
          const color =
            c === "passing"
              ? "pass"
              : c === "rushing"
                ? "rush"
                : "rec";
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-4 py-2 font-heading text-xs font-bold uppercase transition-colors ${
                active
                  ? `bg-${color}/20 text-${color}`
                  : "bg-panel text-dim hover:text-text"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center font-body text-dim">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="px-3 py-2 text-center font-medium w-12">#</th>
                <th className="px-3 py-2 text-left font-medium">Player</th>
                {scope === "season" && (
                  <th className="px-3 py-2 text-center font-medium">Season</th>
                )}
                {scope === "game" && (
                  <>
                    <th className="px-3 py-2 text-left font-medium">Opponent</th>
                    <th className="px-3 py-2 text-center font-medium">Date</th>
                  </>
                )}
                {category === "passing" && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">Comp</th>
                    <th className="px-3 py-2 text-right font-medium">Att</th>
                    <th className="px-3 py-2 text-right font-medium text-pass">Yards</th>
                    <th className="px-3 py-2 text-right font-medium">TD</th>
                    <th className="px-3 py-2 text-right font-medium">INT</th>
                  </>
                )}
                {category === "rushing" && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">Att</th>
                    <th className="px-3 py-2 text-right font-medium text-rush">Yards</th>
                    <th className="px-3 py-2 text-right font-medium">TD</th>
                  </>
                )}
                {category === "receiving" && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">Rec</th>
                    <th className="px-3 py-2 text-right font-medium text-rec">Yards</th>
                    <th className="px-3 py-2 text-right font-medium">TD</th>
                  </>
                )}
                {scope !== "game" && (
                  <th className="px-3 py-2 text-right font-medium">Games</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={`${row.player_id}-${i}`}
                  className="border-b border-border/50 transition-colors hover:bg-panel"
                >
                  <td className="px-3 py-2 text-center text-dim">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/players/${row.player_id}`}
                      className="text-text hover:text-gold hover:underline"
                    >
                      {row.player_name}
                    </Link>
                  </td>
                  {scope === "season" && (
                    <td className="px-3 py-2 text-center text-gold">
                      <Link href={`/seasons/${row.season}`} className="hover:underline">
                        {String(row.season)}
                      </Link>
                    </td>
                  )}
                  {scope === "game" && (
                    <>
                      <td className="px-3 py-2 text-dim">
                        {String(row.opponent ?? "")}
                      </td>
                      <td className="px-3 py-2 text-center text-dim">
                        {String(row.game_date ?? "")}
                      </td>
                    </>
                  )}
                  {category === "passing" && (
                    <>
                      <td className="px-3 py-2 text-right">{String(row.com)}</td>
                      <td className="px-3 py-2 text-right">{String(row.att)}</td>
                      <td className="px-3 py-2 text-right font-bold text-pass">
                        {Number(row.yds).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">{String(row.td)}</td>
                      <td className="px-3 py-2 text-right">{String(row.int_thrown)}</td>
                    </>
                  )}
                  {category === "rushing" && (
                    <>
                      <td className="px-3 py-2 text-right">{String(row.att)}</td>
                      <td className="px-3 py-2 text-right font-bold text-rush">
                        {Number(row.yds).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">{String(row.td)}</td>
                    </>
                  )}
                  {category === "receiving" && (
                    <>
                      <td className="px-3 py-2 text-right">{String(row.rec)}</td>
                      <td className="px-3 py-2 text-right font-bold text-rec">
                        {Number(row.yds).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">{String(row.td)}</td>
                    </>
                  )}
                  {scope !== "game" && (
                    <td className="px-3 py-2 text-right text-dim">{String(row.games)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
