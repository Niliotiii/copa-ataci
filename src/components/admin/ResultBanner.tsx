import type { SaveResult } from "./shared";

/**
 * Banner de feedback padrão das seções do admin (sucesso/erro), com as cores
 * de token do tema. Substitui os blocos inline repetidos em cada seção.
 */
export default function ResultBanner({
  result,
  successLabel,
}: {
  result: (SaveResult & { info?: string }) | null;
  successLabel?: string;
}) {
  if (!result) return null;
  const ok = result.ok;
  return (
    <div
      className="mt-3 rounded-lg p-3 text-sm"
      role="status"
      aria-live="polite"
      style={{
        background: ok ? "var(--primary-soft)" : "rgba(217,45,45,0.1)",
        border: `1px solid ${ok ? "var(--primary)" : "rgba(217,45,45,0.5)"}`,
        color: ok ? "var(--primary)" : "var(--danger)",
      }}
    >
      {ok ? (result.info ?? successLabel ?? "Feito!") : result.error}
    </div>
  );
}
