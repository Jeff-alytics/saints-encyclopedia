"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Search({ placeholder = "Search players..." }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/players?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-panel px-4 py-2.5 font-body text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-gold/10 px-3 py-1 font-heading text-xs font-bold text-gold transition-colors hover:bg-gold/20"
      >
        GO
      </button>
    </form>
  );
}
