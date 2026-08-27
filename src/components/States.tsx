// Estados compartilhados de carregamento / erro / vazio para as telas.

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-16"
      style={{ color: "var(--muted-foreground)" }}
    >
      <span
        aria-hidden="true"
        className="w-5 h-5 rounded-full animate-spin"
        style={{ border: "2px solid var(--border)", borderTopColor: "var(--primary)" }}
      />
      <span className="text-sm" style={{ fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl p-4 text-sm"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.4)",
        color: "#ef4444",
      }}
    >
      <strong style={{ fontFamily: "Oswald, sans-serif" }}>Erro ao carregar dados.</strong>
      <div className="mt-1 opacity-80">{message}</div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl p-8 text-center text-sm"
      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
    >
      {label}
    </div>
  );
}
