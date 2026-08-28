import { useRef, useState } from "react";
import { adminStyles, labelClass } from "./shared";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * Upload de imagem: envia o arquivo para o R2 via POST /api/uploads e devolve
 * a URL (/api/uploads/:key) por onChange. Mostra preview e permite remover.
 * Compatível com data URIs antigos (o preview também os renderiza).
 */
export default function ImageUpload({
  label,
  value,
  token,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  token: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    setErr(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErr("Imagem muito grande (máx. 2MB).");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": file.type },
        body: file,
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(res.status === 401 ? "Token inválido ou ausente." : b.error ?? `Falha (HTTP ${res.status}).`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
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
          disabled={uploading || !token}
          className="text-xs px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif" }}
        >
          {uploading ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ color: "var(--danger)", border: "1px solid var(--border)" }}
          >
            Remover
          </button>
        )}
      </div>
      {err && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
