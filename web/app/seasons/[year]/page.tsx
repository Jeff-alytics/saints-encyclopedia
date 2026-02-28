export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSeasonGames,
  getSeasonTeamStats,
  getSeasonPassingLeaders,
  getSeasonRushingLeaders,
  getSeasonReceivingLeaders,
} from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return { title: `${year} Season | Saints Encyclopedia` };
}

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  const [games, teamStatsArr, passLeaders, rushLeaders, recLeaders] =
    await Promise.all([
      getSeasonGames(year),
      getSeasonTeamStats(year),
      getSeasonPassingLeaders(year),
      getSeasonRushingLeaders(year),
      getSeasonReceivingLeaders(year),
    ]);

  if (games.length === 0) notFound();

  const teamStats = teamStatsArr[0];
  const regularGames = games.filter((g) => g.game_type === "regular");
  const playoffGames = games.filter((g) => g.game_type === "playoff");
  const preseasonGames = games.filter((g) => g.game_type === "preseason");
  const wins = regularGames.filter((g) => g.result === "W").length;
  const losses = regularGames.filter((g) => g.result === "L").length;
  const ties = regularGames.filter((g) => g.result === "T").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-baseline gap-4">
        <h1 className="font-heading text-4xl font-bold text-gold">{year}</h1>
        <span className="font-mono text-xl text-text">
          {wins}-{losses}
          {ties > 0 ? `-${ties}` : ""}
        </span>
      </div>

      {/* Team Stats */}
      {teamStats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <MiniStat label="Points" value={teamStats.total_points} />
          <MiniStat label="Pass Yds" value={teamStats.pass_yds} color="pass" />
          <MiniStat label="Pass TD" value={teamStats.pass_td} color="pass" />
          <MiniStat label="Rush Yds" value={teamStats.rush_yds} color="rush" />
          <MiniStat label="Rush TD" value={teamStats.rush_td} color="rush" />
          <MiniStat label="INT Thrown" value={teamStats.pass_int} />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Game Results */}
        <div className="lg:col-span-2">
          {/* Regular season */}
          <h2 className="mb-3 font-heading text-lg font-bold text-text">
            REGULAR SEASON ({regularGames.length} games)
          </h2>
          <div className="mb-6 overflow-x-auto rounded-lg border border-border">
            <GameTable games={regularGames} />
          </div>

          {/* Playoffs */}
          {playoffGames.length > 0 && (
            <>
              <h2 className="mb-3 font-heading text-lg font-bold text-text">
                PLAYOFFS
              </h2>
              <div className="mb-6 overflow-x-auto rounded-lg border border-border">
                <GameTable games={playoffGames} />
              </div>
            </>
          )}

          {/* Preseason */}
          {preseasonGames.length > 0 && (
            <>
              <h2 className="mb-3 font-heading text-lg font-bold text-text">
                PRESEASON
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <GameTable games={preseasonGames} />
              </div>
            </>
          )}
        </div>

        {/* Season Leaders */}
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-text">
            SEASON LEADERS
          </h2>

          <LeaderSection title="Passing Yards" color="pass" leaders={passLeaders} statKey="yds" />
          <LeaderSection title="Rushing Yards" color="rush" leaders={rushLeaders} statKey="yds" />
          <LeaderSection title="Receiving Yards" color="rec" leaders={recLeaders} statKey="yds" />
        </div>
      </div>
    </div>
  );
}

function GameTable({ games }: { games: { game_id: string; game_date: string; opponent: string; home_away: string; saints_score: number | null; opponent_score: number | null; result: string | null }[] }) {
  return (
    <table className="w-full font-mono text-sm">
      <thead>
        <tr className="border-b border-border text-dim">
          <th className="px-3 py-2 text-left font-medium">Date</th>
          <th className="px-3 py-2 text-center font-medium"></th>
          <th className="px-3 py-2 text-left font-medium">Opponent</th>
          <th className="px-3 py-2 text-right font-medium">Score</th>
          <th className="px-3 py-2 text-center font-medium">W/L</th>
        </tr>
      </thead>
      <tbody>
        {games.map((g) => (
          <tr
            key={g.game_id}
            className="border-b border-border/50 transition-colors hover:bg-panel"
          >
            <td className="px-3 py-2 text-dim">{g.game_date}</td>
            <td className="px-3 py-2 text-center text-dim">
              {g.home_away === "home" ? "vs" : "@"}
            </td>
            <td className="px-3 py-2">
              <Link
                href={`/games/${g.game_id}`}
                className="text-text hover:text-gold hover:underline"
              >
                {g.opponent}
              </Link>
            </td>
            <td className="px-3 py-2 text-right text-text">
              {g.saints_score}–{g.opponent_score}
            </td>
            <td className="px-3 py-2 text-center">
              <span
                className={
                  g.result === "W"
                    ? "text-rush"
                    : g.result === "L"
                      ? "text-rec"
                      : "text-dim"
                }
              >
                {g.result}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const textColor =
    color === "pass"
      ? "text-pass"
      : color === "rush"
        ? "text-rush"
        : color === "rec"
          ? "text-rec"
          : "text-text";
  return (
    <div className="rounded-lg border border-border bg-smoke p-3">
      <div className="font-heading text-[10px] uppercase tracking-wider text-dim">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg font-bold ${textColor}`}>
        {value?.toLocaleString() ?? "-"}
      </div>
    </div>
  );
}

function LeaderSection({
  title,
  color,
  leaders,
  statKey,
}: {
  title: string;
  color: string;
  leaders: Record<string, unknown>[];
  statKey: string;
}) {
  const textColor =
    color === "pass"
      ? "text-pass"
      : color === "rush"
        ? "text-rush"
        : "text-rec";

  if (leaders.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-smoke p-3">
      <div className={`mb-2 font-heading text-xs font-bold uppercase ${textColor}`}>
        {title}
      </div>
      {leaders.map((l, i) => (
        <div
          key={String(l.player_id)}
          className="flex items-baseline justify-between border-b border-border/30 py-1.5 last:border-0"
        >
          <Link
            href={`/players/${l.player_id}`}
            className="text-sm text-text hover:text-gold"
          >
            {i + 1}. {String(l.player_name)}
          </Link>
          <span className={`font-mono text-sm font-bold ${textColor}`}>
            {Number(l[statKey]).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
