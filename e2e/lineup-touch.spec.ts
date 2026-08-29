import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("long-press arrasta o jogador sem rolar", async ({ page }) => {
  await page.goto("/times/ATA");
  await page.getByRole("button", { name: "Limpar campo" }).waitFor();

  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));

  const marker = page.locator('[title*="segure e arraste"]').first();
  const box = await marker.boundingBox();
  if (!box) throw new Error("sem jogador");
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });

  // Long-press: segura ~300ms parado, depois arrasta para a esquerda.
  await touch("touchStart", cx, cy);
  await page.waitForTimeout(300);
  for (let i = 1; i <= 6; i++) await touch("touchMove", cx - (80 * i) / 6, cy);
  await touch("touchEnd", cx - 80, cy);
  await page.waitForTimeout(150);

  const after = await page.locator('[title*="segure e arraste"]').first().boundingBox();
  expect(after && Math.abs(after.x - box.x) > 20).toBe(true); // moveu
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(30); // não rolou
});
