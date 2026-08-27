import { useRef, useState } from "react";
import { adminStyles, labelClass } from "./shared";

const MAX_BYTES = 500 * 1024; // ~500 KB
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

/**
 * Upload de imagem que converte o arquivo em data URI (base64) e devolve via
 * onChange. Mostra preview e botão para remover. Sem storage externo — a imagem
 * fica no próprio registro (D1), com teto de tamanho.
 */
export default function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (dataUri: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    setErr(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErr("Imagem muito grande (máx. 500KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setErr("Falha ao ler o arquivo.");
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className={labelClass} style={adminStyles.label}>{label}</label>
      <div className="flex items-center gap-3 mt-1.5">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>—</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-2 rounded-lg font-semibold"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif" }}
        >
          {value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ color: "#ef4444", border: "1px solid var(--border)" }}
          >
            Remover
          </button>
        )}
      </div>
      {err && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{err}</p>}
    </div>
  );
}
