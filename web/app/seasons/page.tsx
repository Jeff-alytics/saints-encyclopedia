export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSeasons } from "@/lib/queries";

export const metadata = { title: "All Seasons | Saints Encyclopedia" };

export default async function SeasonsPage() {
  const seasons = await getSeasons();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-heading text-3xl font-bold text-gold">
        ALL SEASONS
      </h1>
      <p className="mb-8 font-body text-dim">
        {seasons.length} seasons of New Orleans Saints football (
        {seasons[seasons.length - 1]?.season}–{seasons[0]?.season})
      </p>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {seasons.map((s) => {
          const pct =
            s.games > 0
              ? ((s.wins + s.ties * 0.5) / s.games).toFixed(3).slice(1)
              : ".000";
          return (
            <Link
              key={s.season}
              href={`/seasons/${s.season}`}
              className="group rounded-lg border border-border bg-panel p-4 transition-colors hover:border-gold/30"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-2xl font-bold text-gold">
                  {s.season}
                </span>
                <span className="font-mono text-xs text-dim">{pct}</span>
              </div>
              <div className="mt-1 font-mono text-lg text-text">
                {s.wins}-{s.losses}
                {s.ties > 0 ? `-${s.ties}` : ""}
              </div>
              <div className="mt-1 font-mono text-xs text-dim">
                PF {s.points_for} &middot; PA {s.points_against}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
