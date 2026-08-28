import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/**
 * Select estilizado e acessível (substitui o <select> nativo, cuja aparência
 * do dropdown não segue o tema). Sem dependências externas.
 *
 * A11y: role=listbox/option, aria-expanded/activedescendant, navegação por
 * teclado (setas, Enter/Espaço, Esc, Home/End, type-ahead), fecha ao clicar
 * fora e devolve o foco ao botão.
 */
export default function Select({
  value,
  options,
  onChange,
  placeholder = "Selecione…",
  ariaLabel,
  className,
  disabled,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const typeahead = useRef<{ str: string; t: number }>({ str: "", t: 0 });

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    // Posiciona o índice ativo no item selecionado ao abrir.
    setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rola o item ativo para a vista.
  useEffect(() => {
    if (!open || activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  }

  function moveActive(delta: number) {
    setActiveIdx((cur) => {
      let i = cur;
      for (let n = 0; n < options.length; n++) {
        i = (i + delta + options.length) % options.length;
        if (!options[i].disabled) return i;
      }
      return cur;
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); moveActive(1); break;
      case "ArrowUp": e.preventDefault(); moveActive(-1); break;
      case "Home": e.preventDefault(); setActiveIdx(options.findIndex((o) => !o.disabled)); break;
      case "End": e.preventDefault(); setActiveIdx(options.length - 1); break;
      case "Enter": case " ": e.preventDefault(); commit(activeIdx); break;
      case "Escape": e.preventDefault(); setOpen(false); btnRef.current?.focus(); break;
      case "Tab": setOpen(false); break;
      default:
        // type-ahead: acumula letras e pula para a opção que começa com elas.
        if (e.key.length === 1) {
          const now = Date.now();
          const str = (now - typeahead.current.t < 800 ? typeahead.current.str : "") + e.key.toLowerCase();
          typeahead.current = { str, t: now };
          const idx = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(str));
          if (idx >= 0) setActiveIdx(idx);
        }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none text-left disabled:opacity-50"
        style={{
          background: "var(--secondary)",
          color: selected ? "var(--foreground)" : "var(--muted-foreground)",
          border: "1px solid var(--border)",
          fontFamily: "Inter, sans-serif",
          minHeight: 40,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <CaretDown size={16} weight="bold" style={{ flexShrink: 0, opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} aria-hidden />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={activeIdx >= 0 ? `${baseId}-opt-${activeIdx}` : undefined}
          tabIndex={-1}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg py-1 shadow-xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm" style={{ color: "var(--muted-foreground)" }}>Sem opções</li>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIdx;
            return (
              <li
                key={opt.value + i}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => !opt.disabled && setActiveIdx(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(i); }}
                className="px-3 py-2 text-sm flex items-center justify-between gap-2"
                style={{
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                  opacity: opt.disabled ? 0.5 : 1,
                  background: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && !isActive && (
                  <Check size={14} weight="bold" color="var(--primary)" style={{ flexShrink: 0 }} aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
