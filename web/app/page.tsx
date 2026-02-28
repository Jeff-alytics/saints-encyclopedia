export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search } from "@/components/search";
import { GameCard } from "@/components/game-card";
import {
  getFranchiseSummary,
  getRecentGames,
  getRecentSeasons,
} from "@/lib/queries";

export default async function Home() {
  const [summary, recentGames, recentSeasons] = await Promise.all([
    getFranchiseSummary(),
    getRecentGames(5),
    getRecentSeasons(3),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="font-heading text-5xl font-bold tracking-wide text-gold sm:text-6xl">
          SAINTS ENCYCLOPEDIA
        </h1>
        <p className="mt-3 font-body text-lg text-dim">
          Complete statistical history of the New Orleans Saints (1967–present)
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <Search placeholder="Search players, games..." />
        </div>
      </div>

      {/* Franchise Summary */}
      {summary && (
        <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="All-Time Record"
            value={`${summary.wins}-${summary.losses}${summary.ties > 0 ? `-${summary.ties}` : ""}`}
          />
          <StatCard
            label="Seasons"
            value={`${summary.last_season - summary.first_season + 1}`}
            sub={`${summary.first_season}–${summary.last_season}`}
          />
          <StatCard
            label="Super Bowls"
            value="1"
            sub="XLIV (2009)"
          />
          <StatCard
            label="Total Players"
            value={summary.total_players.toLocaleString()}
          />
        </div>
      )}

      {/* Recent Seasons */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-text">
            RECENT SEASONS
          </h2>
          <Link
            href="/seasons"
            className="font-body text-sm text-gold hover:underline"
          >
            View all seasons
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {recentSeasons.map((s) => (
            <Link
              key={s.season}
              href={`/seasons/${s.season}`}
              className="rounded-lg border border-border bg-panel p-4 transition-colors hover:border-gold/30"
            >
              <div className="font-heading text-2xl font-bold text-gold">
                {s.season}
              </div>
              <div className="mt-1 font-mono text-lg text-text">
                {s.wins}-{s.losses}
                {s.ties > 0 ? `-${s.ties}` : ""}
              </div>
              <div className="mt-1 font-mono text-xs text-dim">
                PF {s.points_for} | PA {s.points_against}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Games */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-text">
            RECENT GAMES
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {recentGames.map((game) => (
            <GameCard key={game.game_id} game={game} />
          ))}
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/seasons"
          title="Seasons"
          desc="Browse all 59 seasons from 1967 to present"
        />
        <NavCard
          href="/players"
          title="Players"
          desc="Search thousands of players with career stats"
        />
        <NavCard
          href="/stats"
          title="Leaderboards"
          desc="Career, season, and single-game records"
        />
        <NavCard
          href="/ask"
          title="Ask AI"
          desc="Ask questions about Saints history in plain English"
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="font-heading text-xs font-medium uppercase tracking-wider text-dim">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold text-text">
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-xs text-muted">{sub}</div>}
    </div>
  );
}

function NavCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-border bg-smoke p-5 transition-colors hover:border-gold/30 hover:bg-panel"
    >
      <h3 className="font-heading text-lg font-bold text-gold transition-colors group-hover:text-gold">
        {title}
      </h3>
      <p className="mt-1 font-body text-sm text-dim">{desc}</p>
    </Link>
  );
}
