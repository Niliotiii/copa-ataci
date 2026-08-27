import { useEffect, useRef } from "react";

/**
 * Modal de confirmação in-app (substitui window.confirm). Acessível: role=dialog,
 * aria-modal, foco inicial no botão seguro, fecha no Escape, backdrop clicável.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={cancelLabel} onClick={onCancel} className="absolute inset-0 w-full h-full" style={{ background: "rgba(0,0,0,0.5)", border: "none" }} />
      <div className="relative w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold uppercase mb-2" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>{title}</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button ref={cancelRef} onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ minHeight: 44, background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ minHeight: 44, background: destructive ? "#dc2626" : "var(--primary)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
