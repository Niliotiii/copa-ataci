// Estados compartilhados de carregamento / erro / vazio para as telas.

/**
 * Skeleton de carregamento: barras "shimmer" que imitam linhas de tabela/lista,
 * em vez de um spinner com texto. Sensação de app mais polido e responsivo.
 */
export function LoadingState({ label = "Carregando…", rows = 6 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-3"
            style={{ background: i % 2 === 0 ? "var(--card)" : "var(--secondary)" }}
          >
            <span className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} aria-hidden />
            <span className="skeleton" style={{ height: 12, flex: 1, maxWidth: `${60 - i * 4}%` }} aria-hidden />
            <span className="skeleton" style={{ width: 32, height: 12 }} aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl p-4 text-sm"
      style={{
        background: "rgba(217,45,45,0.08)",
        border: "1px solid rgba(217,45,45,0.4)",
        color: "var(--danger)",
      }}
    >
      <strong style={{ fontFamily: "Oswald, sans-serif" }}>Erro ao carregar dados.</strong>
      <div className="mt-1 opacity-80">{message}</div>
    </div>
  );
}

/**
 * Estado vazio com um ícone grande e discreto em vez de só texto — dá acabamento
 * e comunica "nada aqui ainda" de forma mais amigável.
 */
export function EmptyState({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center"
      style={{ background: "var(--card)", border: "1px dashed var(--border)" }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 56, height: 56, background: "var(--secondary)", color: "var(--muted-foreground)" }}
        aria-hidden
      >
        {icon ?? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        )}
      </div>
      <span className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );
}
