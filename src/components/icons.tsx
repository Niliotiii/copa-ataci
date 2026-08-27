// Ícones SVG (stroke = currentColor) para navegação e ações da UI.
// Substituem emojis para consistência visual e acessibilidade.

type IconProps = { size?: number; className?: string };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

// Troféu — Classificação
export function TrophyIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

// Bola — Jogos
export function BallIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4.7 3.4-1.8 5.5H9.1l-1.8-5.5L12 7z" />
    </svg>
  );
}

// Chave/eliminatória — Mata-Mata
export function BracketIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 4v4a2 2 0 0 0 2 2h4M6 20v-4a2 2 0 0 1 2-2h4" />
      <path d="M12 12h6" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="6" cy="4" r="1.5" />
      <circle cx="6" cy="20" r="1.5" />
    </svg>
  );
}

// Camisa — Times
export function ShirtIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 3l4 2 4-2 4 3-2.5 3H18v11H6V9H3.5L1 6l4-3h3z" />
    </svg>
  );
}

// Cadeado — Admin
export function LockIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// X — fechar / remover
export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
