// Gerador de tabela da fase de grupos: todos-contra-todos, turno único.
// Algoritmo "circle method" (rotação). Puro (sem I/O) para ser testável.

export type Pairing = { round: number; home: string; away: string };

/**
 * Gera os confrontos de um returno único todos-contra-todos.
 *
 * - `teamIds`: ids dos times (ex.: ["ATA","LEO",...]). A ordem é preservada
 *   como semente da rotação.
 * - Com N times: N-1 rodadas se N par; N rodadas se N ímpar (um time folga
 *   por rodada — o "bye").
 * - Alterna mando de campo por rodada para equilibrar casa/fora.
 *
 * Retorna a lista de confrontos com o número da rodada (1-based).
 */
export function generateRoundRobin(teamIds: string[]): Pairing[] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];

  // Se ímpar, adiciona um "bye" (folga) para o algoritmo trabalhar com par.
  const BYE = "__BYE__";
  if (teams.length % 2 === 1) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  // Fixa o primeiro time; os demais rotacionam.
  const fixed = teams[0];
  let rotating = teams.slice(1);

  const pairings: Pairing[] = [];

  for (let r = 0; r < rounds; r++) {
    const roundNo = r + 1;
    const left = [fixed, ...rotating.slice(0, half - 1)];
    const right = rotating.slice(half - 1).reverse();

    for (let i = 0; i < half; i++) {
      const a = left[i];
      const b = right[i];
      if (a === BYE || b === BYE) continue; // time folga nesta rodada

      // Alterna o mando por rodada (equilíbrio casa/fora).
      const [home, away] = roundNo % 2 === 0 ? [b, a] : [a, b];
      pairings.push({ round: roundNo, home, away });
    }

    // Rotaciona: último vai para a frente da lista rotativa.
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)];
  }

  return pairings;
}
