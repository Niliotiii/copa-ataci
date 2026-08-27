// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PitchEditor, { type PitchPlayer } from "./PitchEditor";

const players: PitchPlayer[] = [
  { name: "Gol", number: "1", position: "GOL", posX: "50", posY: "50" },
];

// jsdom não implementa getBoundingClientRect com dimensões; mockamos.
function mockRect(el: Element, rect: Partial<DOMRect>) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300, x: 0, y: 0, toJSON: () => {},
    ...rect,
  } as DOMRect);
}

beforeEach(() => vi.restoreAllMocks());

describe("PitchEditor", () => {
  it("converte pixel→percentual no onMove (centro = 50/50)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <PitchEditor players={players} teamColor="#16a34a" onMove={onMove} />,
    );
    const field = container.firstElementChild as HTMLElement;
    mockRect(field, { width: 200, height: 300 });
    const marker = field.querySelector("[title]") as HTMLElement;
    if (marker.setPointerCapture === undefined) marker.setPointerCapture = () => {};

    marker.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0, pointerId: 1 } as any));
    // centro do campo (100px de 200 largura, 150px de 300 altura) = 50%,50%
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 150 } as any));

    expect(onMove).toHaveBeenCalled();
    const [, x, y] = onMove.mock.calls.at(-1)!;
    expect(x).toBeCloseTo(50, 1);
    expect(y).toBeCloseTo(50, 1);
    window.dispatchEvent(new PointerEvent("pointerup", {} as any));
  });

  it("faz clamp de coordenadas fora do campo para 0..100", () => {
    const onMove = vi.fn();
    const { container } = render(
      <PitchEditor players={players} teamColor="#16a34a" onMove={onMove} />,
    );
    const field = container.firstElementChild as HTMLElement;
    mockRect(field, { width: 200, height: 300 });
    const marker = field.querySelector("[title]") as HTMLElement;
    if (marker.setPointerCapture === undefined) marker.setPointerCapture = () => {};

    marker.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0, pointerId: 1 } as any));
    // muito além da borda → deve clampar em 100/100
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 9999, clientY: 9999 } as any));

    const [, x, y] = onMove.mock.calls.at(-1)!;
    expect(x).toBe(100);
    expect(y).toBe(100);
    window.dispatchEvent(new PointerEvent("pointerup", {} as any));
  });
});
