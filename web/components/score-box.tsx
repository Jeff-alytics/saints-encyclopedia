export function ScoreBox({
  saints,
  opponent,
  opponentName,
  homeAway,
  result,
}: {
  saints: number | null;
  opponent: number | null;
  opponentName: string;
  homeAway: string;
  result: string | null;
}) {
  const isWin = result === "W";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-panel p-4">
      <div className="flex flex-col items-center gap-1">
        <span className="font-heading text-xs uppercase text-dim">
          {homeAway === "home" ? "vs" : "@"}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col">
          <span className="font-heading text-sm font-bold text-gold">
            Saints
          </span>
          <span className="font-mono text-2xl font-bold text-text">
            {saints ?? "-"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-heading text-sm font-bold text-dim">
            {opponentName}
          </span>
          <span className="font-mono text-2xl font-bold text-dim">
            {opponent ?? "-"}
          </span>
        </div>
      </div>
      <span
        className={`rounded px-2 py-1 font-heading text-sm font-bold ${
          isWin
            ? "bg-rush/20 text-rush"
            : result === "L"
              ? "bg-rec/20 text-rec"
              : "bg-muted/20 text-muted"
        }`}
      >
        {result ?? "-"}
      </span>
    </div>
  );
}
