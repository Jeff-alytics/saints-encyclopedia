import Link from "next/link";
import type { Game } from "@/lib/queries";

export function GameCard({ game }: { game: Game }) {
  const isWin = game.result === "W";
  const isLoss = game.result === "L";

  return (
    <Link
      href={`/games/${game.game_id}`}
      className="flex items-center justify-between rounded-lg border border-border bg-panel p-4 transition-colors hover:border-gold/30"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-dim">
          {game.game_date} &middot; {game.home_away === "home" ? "vs" : "@"}
        </span>
        <span className="font-body text-sm font-medium text-text">
          {game.opponent}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-medium text-text">
          {game.saints_score}–{game.opponent_score}
        </span>
        <span
          className={`rounded px-2 py-0.5 font-heading text-xs font-bold ${
            isWin
              ? "bg-rush/20 text-rush"
              : isLoss
                ? "bg-rec/20 text-rec"
                : "bg-muted/20 text-muted"
          }`}
        >
          {game.result}
        </span>
      </div>
    </Link>
  );
}
