export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGame,
  getGameTeamStats,
  getScoringPlays,
  getGamePassing,
  getGameRushing,
  getGameReceiving,
  getGameDefense,
  getGameSacks,
  getGameInterceptions,
} from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return { title: "Game Not Found" };
  const ha = game.home_away === "home" ? "vs" : "@";
  return {
    title: `Saints ${ha} ${game.opponent} (${game.game_date}) | Saints Encyclopedia`,
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const [
    teamStats,
    scoringPlays,
    passing,
    rushing,
    receiving,
    defense,
    sacks,
    interceptions,
  ] = await Promise.all([
    getGameTeamStats(id),
    getScoringPlays(id),
    getGamePassing(id),
    getGameRushing(id),
    getGameReceiving(id),
    getGameDefense(id),
    getGameSacks(id),
    getGameInterceptions(id),
  ]);

  const saintsStats = teamStats.find(
    (t) => t.team.includes("Saints") || t.team.includes("New Orleans")
  );
  const oppStats = teamStats.find(
    (t) => !t.team.includes("Saints") && !t.team.includes("New Orleans")
  );

  const isSaintsTeam = (team: string) =>
    team.includes("Saints") || team.includes("New Orleans");

  const saintsPassers = passing.filter((p) => isSaintsTeam(p.team));
  const oppPassers = passing.filter((p) => !isSaintsTeam(p.team));
  const saintsRushers = rushing.filter((p) => isSaintsTeam(p.team));
  const oppRushers = rushing.filter((p) => !isSaintsTeam(p.team));
  const saintsReceivers = receiving.filter((p) => isSaintsTeam(p.team));
  const oppReceivers = receiving.filter((p) => !isSaintsTeam(p.team));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-4 font-body text-sm text-dim">
        <Link href="/seasons" className="hover:text-gold">
          Seasons
        </Link>{" "}
        &rsaquo;{" "}
        <Link href={`/seasons/${game.season}`} className="hover:text-gold">
          {game.season}
        </Link>{" "}
        &rsaquo; Game
      </div>

      {/* Score Header */}
      <div className="mb-8 rounded-xl border border-border bg-panel p-6">
        <div className="mb-2 font-mono text-xs text-dim">
          {game.game_date} &middot;{" "}
          {game.game_type !== "regular" && (
            <span className="uppercase text-gold">{game.game_type} &middot; </span>
          )}
          {game.venue && `${game.venue} &middot; `}
          {game.attendance && `Att: ${game.attendance.toLocaleString()}`}
        </div>
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="font-heading text-sm font-bold uppercase text-gold">
              Saints
            </span>
            <span className="font-mono text-4xl font-bold text-text">
              {game.saints_score}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span
              className={`rounded px-3 py-1 font-heading text-sm font-bold ${
                game.result === "W"
                  ? "bg-rush/20 text-rush"
                  : game.result === "L"
                    ? "bg-rec/20 text-rec"
                    : "bg-muted/20 text-muted"
              }`}
            >
              {game.result === "W" ? "WIN" : game.result === "L" ? "LOSS" : "TIE"}
            </span>
            <span className="mt-1 font-mono text-xs text-dim">
              {game.home_away === "home" ? "vs" : "@"}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-heading text-sm font-bold uppercase text-dim">
              {game.opponent}
            </span>
            <span className="font-mono text-4xl font-bold text-dim">
              {game.opponent_score}
            </span>
          </div>
        </div>
      </div>

      {/* Team Stats Comparison */}
      {saintsStats && oppStats && (
        <div className="mb-8">
          <h2 className="mb-3 font-heading text-lg font-bold text-text">
            TEAM STATS
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-border text-dim">
                  <th className="px-3 py-2 text-right font-medium">Saints</th>
                  <th className="px-3 py-2 text-center font-medium">Stat</th>
                  <th className="px-3 py-2 text-left font-medium">
                    {game.opponent}
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompRow
                  label="Rush Att-Yds"
                  saints={`${saintsStats.rush_att}-${saintsStats.rush_yds}`}
                  opp={`${oppStats.rush_att}-${oppStats.rush_yds}`}
                />
                <CompRow
                  label="Rush TD"
                  saints={saintsStats.rush_td}
                  opp={oppStats.rush_td}
                />
                <CompRow
                  label="Pass Comp-Att"
                  saints={`${saintsStats.pass_com}-${saintsStats.pass_att}`}
                  opp={`${oppStats.pass_com}-${oppStats.pass_att}`}
                />
                <CompRow
                  label="Pass Yds"
                  saints={saintsStats.pass_yds}
                  opp={oppStats.pass_yds}
                />
                <CompRow
                  label="Pass TD"
                  saints={saintsStats.pass_td}
                  opp={oppStats.pass_td}
                />
                <CompRow
                  label="INT"
                  saints={saintsStats.pass_int}
                  opp={oppStats.pass_int}
                />
                <CompRow
                  label="Sacks"
                  saints={saintsStats.sacks}
                  opp={oppStats.sacks}
                />
                <CompRow
                  label="Interceptions"
                  saints={saintsStats.interceptions}
                  opp={oppStats.interceptions}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scoring Plays */}
      {scoringPlays.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-heading text-lg font-bold text-text">
            SCORING PLAYS
          </h2>
          <div className="rounded-lg border border-border">
            {scoringPlays.map((play) => (
              <div
                key={play.id}
                className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0"
              >
                <span className="rounded bg-panel px-2 py-0.5 font-mono text-xs text-dim">
                  Q{play.quarter}
                </span>
                <div className="flex-1">
                  <span className="font-body text-sm text-text">
                    {play.description}
                  </span>
                  <span className="ml-2 font-mono text-xs text-dim">
                    ({play.team})
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-gold">
                  {play.saints_score}-{play.opp_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Stats */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Saints Stats */}
        <div>
          <h2 className="mb-4 font-heading text-xl font-bold text-gold">
            SAINTS
          </h2>

          {saintsPassers.length > 0 && (
            <StatSection title="PASSING" color="pass">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">C/A</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">INT</th>
                    <th className="px-2 py-1.5 text-right font-medium">Rtg</th>
                  </tr>
                </thead>
                <tbody>
                  {saintsPassers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5">
                        <Link href={`/players/${p.player_id}`} className="text-text hover:text-gold">
                          {p.player_name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-right">{p.com}/{p.att}</td>
                      <td className="px-2 py-1.5 text-right text-pass">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.int_thrown}</td>
                      <td className="px-2 py-1.5 text-right">{p.rtg?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}

          {saintsRushers.length > 0 && (
            <StatSection title="RUSHING" color="rush">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">Att</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">Avg</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lg</th>
                  </tr>
                </thead>
                <tbody>
                  {saintsRushers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5">
                        <Link href={`/players/${p.player_id}`} className="text-text hover:text-gold">
                          {p.player_name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-right">{p.att}</td>
                      <td className="px-2 py-1.5 text-right text-rush">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.avg?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.lg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}

          {saintsReceivers.length > 0 && (
            <StatSection title="RECEIVING" color="rec">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">Rec</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">Avg</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lg</th>
                  </tr>
                </thead>
                <tbody>
                  {saintsReceivers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5">
                        <Link href={`/players/${p.player_id}`} className="text-text hover:text-gold">
                          {p.player_name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-right">{p.rec}</td>
                      <td className="px-2 py-1.5 text-right text-rec">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.avg?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.lg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}
        </div>

        {/* Opponent Stats */}
        <div>
          <h2 className="mb-4 font-heading text-xl font-bold text-dim">
            {game.opponent.toUpperCase()}
          </h2>

          {oppPassers.length > 0 && (
            <StatSection title="PASSING" color="pass">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">C/A</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">INT</th>
                    <th className="px-2 py-1.5 text-right font-medium">Rtg</th>
                  </tr>
                </thead>
                <tbody>
                  {oppPassers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5 text-text">{p.player_name}</td>
                      <td className="px-2 py-1.5 text-right">{p.com}/{p.att}</td>
                      <td className="px-2 py-1.5 text-right text-pass">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.int_thrown}</td>
                      <td className="px-2 py-1.5 text-right">{p.rtg?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}

          {oppRushers.length > 0 && (
            <StatSection title="RUSHING" color="rush">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">Att</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">Avg</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lg</th>
                  </tr>
                </thead>
                <tbody>
                  {oppRushers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5 text-text">{p.player_name}</td>
                      <td className="px-2 py-1.5 text-right">{p.att}</td>
                      <td className="px-2 py-1.5 text-right text-rush">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.avg?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.lg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}

          {oppReceivers.length > 0 && (
            <StatSection title="RECEIVING" color="rec">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="px-2 py-1.5 text-left font-medium">Player</th>
                    <th className="px-2 py-1.5 text-right font-medium">Rec</th>
                    <th className="px-2 py-1.5 text-right font-medium">Yds</th>
                    <th className="px-2 py-1.5 text-right font-medium">Avg</th>
                    <th className="px-2 py-1.5 text-right font-medium">TD</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lg</th>
                  </tr>
                </thead>
                <tbody>
                  {oppReceivers.map((p) => (
                    <tr key={p.player_id} className="border-b border-border/30 hover:bg-smoke">
                      <td className="px-2 py-1.5 text-text">{p.player_name}</td>
                      <td className="px-2 py-1.5 text-right">{p.rec}</td>
                      <td className="px-2 py-1.5 text-right text-rec">{p.yds}</td>
                      <td className="px-2 py-1.5 text-right">{p.avg?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-right">{p.td}</td>
                      <td className="px-2 py-1.5 text-right">{p.lg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StatSection>
          )}
        </div>
      </div>
    </div>
  );
}

function CompRow({
  label,
  saints,
  opp,
}: {
  label: string;
  saints: string | number;
  opp: string | number;
}) {
  return (
    <tr className="border-b border-border/50">
      <td className="px-3 py-2 text-right font-mono text-text">{saints}</td>
      <td className="px-3 py-2 text-center font-heading text-xs uppercase text-dim">
        {label}
      </td>
      <td className="px-3 py-2 text-left font-mono text-text">{opp}</td>
    </tr>
  );
}

function StatSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const borderColor =
    color === "pass"
      ? "border-pass/30"
      : color === "rush"
        ? "border-rush/30"
        : "border-rec/30";
  const textColor =
    color === "pass"
      ? "text-pass"
      : color === "rush"
        ? "text-rush"
        : "text-rec";

  return (
    <div className={`mb-4 rounded-lg border ${borderColor} bg-smoke`}>
      <div className={`px-3 py-2 font-heading text-xs font-bold uppercase ${textColor}`}>
        {title}
      </div>
      {children}
    </div>
  );
}
