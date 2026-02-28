const colors = {
  passing: { bg: "bg-pass/15", text: "text-pass", label: "PASS" },
  rushing: { bg: "bg-rush/15", text: "text-rush", label: "RUSH" },
  receiving: { bg: "bg-rec/15", text: "text-rec", label: "REC" },
  defense: { bg: "bg-dim/15", text: "text-dim", label: "DEF" },
} as const;

export function StatBadge({
  type,
}: {
  type: "passing" | "rushing" | "receiving" | "defense";
}) {
  const c = colors[type];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-heading text-[10px] font-bold tracking-wider ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}
