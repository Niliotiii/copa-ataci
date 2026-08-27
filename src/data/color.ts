/** Retorna "#000" ou "#fff" conforme a luminância da cor de fundo (#rrggbb),
 *  garantindo contraste do texto sobre o escudo do time. */
export function textColorOn(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  if (hex.length < 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // Luminância relativa (aproximação sRGB).
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#000" : "#fff";
}
