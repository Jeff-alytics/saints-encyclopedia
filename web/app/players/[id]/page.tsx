export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlayer,
  getPlayerCareerPassing,
  getPlayerCareerRushing,
  getPlayerCareerReceiving,
  getPlayerSeasonStats,
  getPlayerSeasonRushing,
  getPlayerSeasonReceiving,
  getPlayerGameLog,
} from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return { title: "Player Not Found" };
  return { title: `${player.player_name} | Saints Encyclopedia` };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  const [
    careerPassing,
    careerRushing,
    careerReceiving,
    seasonPassing,
    seasonRushing,
    seasonReceiving,
    gameLog,
  ] = await Promise.all([
    getPlayerCareerPassing(id),
    getPlayerCareerRushing(id),
    getPlayerCareerReceiving(id),
    getPlayerSeasonStats(id),
    getPlayerSeasonRushing(id),
    getPlayerSeasonReceiving(id),
    getPlayerGameLog(id),
  ]);

  const hasPassing = careerPassing && Number(careerPassing.att) > 0;
  const hasRushing = careerRushing && Number(careerRushing.att) > 0;
  const hasReceiving = careerReceiving && Number(careerReceiving.rec) > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1 font-body text-sm text-dim">
          <Link href="/players" className="hover:text-gold">
            Players
          </Link>{" "}
          &rsaquo;
        </div>
        <h1 className="font-heading text-4xl font-bold text-gold">
          {player.player_name.toUpperCase()}
        </h1>
        {(hasPassing || hasRushing || hasReceiving) && (
          <p className="mt-1 font-mono text-sm text-dim">
            {hasPassing ? `${careerPassing!.first_season}` : hasRushing ? `${careerRushing!.first_season}` : `${careerReceiving!.first_season}`}
            –
            {hasPassing ? `${careerPassing!.last_season}` : hasRushing ? `${careerRushing!.last_season}` : `${careerReceiving!.last_season}`}
          </p>
        )}
      </div>

      {/* Career Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasPassing && (
          <CareerCard
            title="CAREER PASSING"
            color="pass"
            stats={[
              { label: "Games", value: careerPassing.games },
              { label: "Comp", value: Number(careerPassing.com).toLocaleString() },
              { label: "Att", value: Number(careerPassing.att).toLocaleString() },
              { label: "Yards", value: Number(careerPassing.yds).toLocaleString() },
              { label: "TD", value: careerPassing.td },
              { label: "INT", value: careerPassing.int_thrown },
            ]}
          />
        )}
        {hasRushing && (
          <CareerCard
            title="CAREER RUSHING"
            color="rush"
            stats={[
              { label: "Games", value: careerRushing.games },
              { label: "Att", value: Number(careerRushing.att).toLocaleString() },
              { label: "Yards", value: Number(careerRushing.yds).toLocaleString() },
              { label: "TD", value: careerRushing.td },
            ]}
          />
        )}
        {hasReceiving && (
          <CareerCard
            title="CAREER RECEIVING"
            color="rec"
            stats={[
              { label: "Games", value: careerReceiving.games },
              { label: "Rec", value: Number(careerReceiving.rec).toLocaleString() },
              { label: "Yards", value: Number(careerReceiving.yds).toLocaleString() },
              { label: "TD", value: careerReceiving.td },
            ]}
          />
        )}
      </div>

      {/* Season-by-Season Breakdown */}
      {hasPassing && seasonPassing.length > 0 && (
        <SeasonTable
          title="PASSING BY SEASON"
          color="pass"
          headers={["Season", "GP", "Comp", "Att", "Yards", "TD", "INT"]}
          rows={seasonPassing.map((s: Record<string, unknown>) => [
            s.season,
            s.pass_games,
            s.pass_com,
            s.pass_att,
            Number(s.pass_yds).toLocaleString(),
            s.pass_td,
            s.pass_int,
          ])}
        />
      )}

      {hasRushing && seasonRushing.length > 0 && (
        <SeasonTable
          title="RUSHING BY SEASON"
          color="rush"
          headers={["Season", "GP", "Att", "Yards", "TD"]}
          rows={seasonRushing.map((s: Record<string, unknown>) => [
            s.season,
            s.rush_games,
            s.rush_att,
            Number(s.rush_yds).toLocaleString(),
            s.rush_td,
          ])}
        />
      )}

      {hasReceiving && seasonReceiving.length > 0 && (
        <SeasonTable
          title="RECEIVING BY SEASON"
          color="rec"
          headers={["Season", "GP", "Rec", "Yards", "TD"]}
          rows={seasonReceiving.map((s: Record<string, unknown>) => [
            s.season,
            s.rec_games,
            s.rec,
            Number(s.rec_yds).toLocaleString(),
            s.rec_td,
          ])}
        />
      )}

      {/* Game Log */}
      {gameLog.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-bold text-text">
            GAME LOG ({gameLog.length} games)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-dim">
                  <th className="px-2 py-1.5 text-left font-medium">Date</th>
                  <th className="px-2 py-1.5 text-left font-medium">Opp</th>
                  <th className="px-2 py-1.5 text-center font-medium">W/L</th>
                  <th className="px-2 py-1.5 text-right font-medium">Score</th>
                  {hasPassing && (
                    <>
                      <th className="px-2 py-1.5 text-right font-medium text-pass">C/A</th>
                      <th className="px-2 py-1.5 text-right font-medium text-pass">PYd</th>
                      <th className="px-2 py-1.5 text-right font-medium text-pass">PTD</th>
                      <th className="px-2 py-1.5 text-right font-medium text-pass">INT</th>
                    </>
                  )}
                  {hasRushing && (
                    <>
                      <th className="px-2 py-1.5 text-right font-medium text-rush">RAtt</th>
                      <th className="px-2 py-1.5 text-right font-medium text-rush">RYd</th>
                      <th className="px-2 py-1.5 text-right font-medium text-rush">RTD</th>
                    </>
                  )}
                  {hasReceiving && (
                    <>
                      <th className="px-2 py-1.5 text-right font-medium text-rec">Rec</th>
                      <th className="px-2 py-1.5 text-right font-medium text-rec">RecYd</th>
                      <th className="px-2 py-1.5 text-right font-medium text-rec">RecTD</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {gameLog.map((g: Record<string, unknown>) => (
                  <tr
                    key={String(g.game_id)}
                    className="border-b border-border/30 hover:bg-panel"
                  >
                    <td className="px-2 py-1.5 text-dim">
                      <Link
                        href={`/games/${g.game_id}`}
                        className="hover:text-gold"
                      >
                        {String(g.game_date)}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">
                      {g.home_away === "home" ? "vs " : "@ "}
                      {String(g.opponent)}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-center ${
                        g.result === "W"
                          ? "text-rush"
                          : g.result === "L"
                            ? "text-rec"
                            : "text-dim"
                      }`}
                    >
                      {String(g.result)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {String(g.saints_score)}-{String(g.opponent_score)}
                    </td>
                    {hasPassing && (
                      <>
                        <td className="px-2 py-1.5 text-right">
                          {g.pass_com != null ? `${g.pass_com}/${g.pass_att}` : "-"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-pass">
                          {String(g.pass_yds ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.pass_td ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.pass_int ?? "-")}
                        </td>
                      </>
                    )}
                    {hasRushing && (
                      <>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.rush_att ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right text-rush">
                          {String(g.rush_yds ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.rush_td ?? "-")}
                        </td>
                      </>
                    )}
                    {hasReceiving && (
                      <>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.rec ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right text-rec">
                          {String(g.rec_yds ?? "-")}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {String(g.rec_td ?? "-")}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CareerCard({
  title,
  color,
  stats,
}: {
  title: string;
  color: string;
  stats: { label: string; value: unknown }[];
}) {
  const borderColor =
    color === "pass"
      ? "border-pass/30"
      : color === "rush"
        ? "border-rush/30"
        : "border-rec/30";
  const textColor =
    color === "pass" ? "text-pass" : color === "rush" ? "text-rush" : "text-rec";

  return (
    <div className={`rounded-lg border ${borderColor} bg-smoke p-4`}>
      <h3 className={`mb-3 font-heading text-xs font-bold uppercase ${textColor}`}>
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-heading text-[10px] uppercase tracking-wider text-dim">
              {s.label}
            </div>
            <div className="font-mono text-lg font-bold text-text">
              {String(s.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeasonTable({
  title,
  color,
  headers,
  rows,
}: {
  title: string;
  color: string;
  headers: string[];
  rows: unknown[][];
}) {
  const textColor =
    color === "pass" ? "text-pass" : color === "rush" ? "text-rush" : "text-rec";
  const borderColor =
    color === "pass"
      ? "border-pass/30"
      : color === "rush"
        ? "border-rush/30"
        : "border-rec/30";

  return (
    <div className="mb-6">
      <h2 className={`mb-3 font-heading text-lg font-bold ${textColor}`}>
        {title}
      </h2>
      <div className={`overflow-x-auto rounded-lg border ${borderColor}`}>
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="border-b border-border text-dim">
              {headers.map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2 font-medium ${h === "Season" ? "text-left" : "text-right"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-panel">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2 ${j === 0 ? "text-left text-gold" : "text-right"}`}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
