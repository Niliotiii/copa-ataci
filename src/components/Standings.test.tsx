// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Mocka o hook useApi para devolver dados controlados.
vi.mock("../data/useApi", () => ({
  useApi: () => ({
    data: [
      { pos: 1, abbr: "ATA", name: "Ataci FC", color: "#16a34a", pts: 6, j: 2, v: 2, e: 0, d: 0, gp: 11, gc: 3, sg: 8 },
      { pos: 2, abbr: "REL", name: "Relâmpago SC", color: "#d97706", pts: 3, j: 1, v: 1, e: 0, d: 0, gp: 6, gc: 1, sg: 5 },
    ],
    loading: false,
    error: null,
  }),
  invalidateCache: () => {},
}));

import Standings from "./Standings";

describe("Standings", () => {
  it("renderiza uma tabela semântica com os times na ordem da API", () => {
    render(<Standings />);
    const table = screen.getByRole("table");
    expect(table).toBeDefined();

    // Cabeçalhos de coluna acessíveis
    expect(within(table).getByText("PTS")).toBeDefined();

    // Linhas na ordem: ATA (1º) antes de REL (2º)
    const rowHeaders = within(table).getAllByRole("rowheader"); // <th scope="row"> = pos
    // primeira linha de dados tem pos "1"
    expect(rowHeaders[0].textContent).toContain("1");
    expect(screen.getByText("Ataci FC")).toBeDefined();
    expect(screen.getByText("Relâmpago SC")).toBeDefined();
  });
});
