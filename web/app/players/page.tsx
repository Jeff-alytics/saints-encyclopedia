export const dynamic = "force-dynamic";

import Link from "next/link";
import { getPlayersWithStats, searchPlayers } from "@/lib/queries";
import { Search } from "@/components/search";

export const metadata = { title: "Players | Saints Encyclopedia" };

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const players = q
    ? await searchPlayers(q, 100)
    : await getPlayersWithStats(200, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-bold text-gold">PLAYERS</h1>
        <Search placeholder="Search by name..." />
      </div>

      {q && (
        <p className="mb-4 font-body text-sm text-dim">
          {players.length} results for &ldquo;{q}&rdquo;
          <Link href="/players" className="ml-2 text-gold hover:underline">
            Clear
          </Link>
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="border-b border-border text-dim">
              <th className="px-3 py-2 text-left font-medium">Player</th>
              {!q && (
                <>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-pass">Pass Yds</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-pass">Pass TD</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-rush">Rush Yds</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-rush">Rush TD</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-rec">Rec Yds</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="text-rec">Rec TD</span>
                  </th>
                </>
              )}
              {q && (
                <>
                  <th className="px-3 py-2 text-right font-medium">First</th>
                  <th className="px-3 py-2 text-right font-medium">Last</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {players.map((p: Record<string, unknown>) => (
              <tr
                key={String(p.player_id)}
                className="border-b border-border/50 transition-colors hover:bg-panel"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/players/${p.player_id}`}
                    className="text-text hover:text-gold hover:underline"
                  >
                    {String(p.player_name)}
                  </Link>
                </td>
                {!q && (
                  <>
                    <td className="px-3 py-2 text-right text-pass">
                      {Number(p.pass_yds) > 0
                        ? Number(p.pass_yds).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(p.pass_td) > 0 ? String(p.pass_td) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-rush">
                      {Number(p.rush_yds) > 0
                        ? Number(p.rush_yds).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(p.rush_td) > 0 ? String(p.rush_td) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-rec">
                      {Number(p.rec_yds) > 0
                        ? Number(p.rec_yds).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(p.rec_td) > 0 ? String(p.rec_td) : "-"}
                    </td>
                  </>
                )}
                {q && (
                  <>
                    <td className="px-3 py-2 text-right text-dim">
                      {String(p.first_season ?? "-")}
                    </td>
                    <td className="px-3 py-2 text-right text-dim">
                      {String(p.last_season ?? "-")}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {players.length === 0 && (
        <div className="py-12 text-center font-body text-dim">
          No players found.
        </div>
      )}
    </div>
  );
}
