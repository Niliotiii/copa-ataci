import type { ReactNode } from "react";

/**
 * Cabeçalho de seção com hierarquia clara: um "kicker" (rótulo curto maiúsculo
 * em dourado) acima de um título grande em Oswald com um traço de assinatura.
 * Aceita um slot à direita (ex.: seletor de rodada, chip de temporada).
 */
export default function SectionHeader({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {kicker && <div className="kicker mb-1">{kicker}</div>}
        <h2 className="section-title text-2xl lg:text-3xl">{title}</h2>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
