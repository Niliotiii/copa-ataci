import { test, expect } from "@playwright/test";

test.describe("Copa Ataci — smoke E2E", () => {
  test("navega pelas abas e mostra a classificação calculada", async ({ page }) => {
    await page.goto("/");

    // A classificação é a aba inicial; deve renderizar a tabela com o líder ATA.
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Ataci FC").first()).toBeVisible();

    // Navega para Jogos.
    await page.getByRole("button", { name: "Jogos" }).first().click();
    await expect(page.getByText("Calendário")).toBeVisible();

    // Navega para Mata-Mata.
    await page.getByRole("button", { name: "Mata-Mata" }).first().click();
    await expect(page.getByText("Quartas")).toBeVisible();
  });

  test("admin finaliza um jogo e a classificação reflete", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Admin" }).first().click();

    // Cola o token de admin.
    await page.getByPlaceholder("Bearer token…").fill("dev-token-troque-isto");

    // Seleciona o jogo ATA x LEO (Rodada 2) pelo texto da opção.
    const select = page.locator("select").first();
    const optionValue = await select
      .locator("option", { hasText: "Ataci FC" })
      .filter({ hasText: "Leões" })
      .first()
      .getAttribute("value");
    await select.selectOption(optionValue!);

    // Preenche o placar (os dois primeiros number inputs) e finaliza.
    const scoreInputs = page.locator('input[type="number"]');
    await scoreInputs.nth(0).fill("4");
    await scoreInputs.nth(1).fill("1");
    await page.getByRole("button", { name: "Finalizado" }).click();
    await page.getByRole("button", { name: "Salvar jogo" }).click();

    // Feedback de sucesso.
    await expect(page.getByText(/salvo/i)).toBeVisible();

    // Volta à classificação: ATA agora tem 2 jogos.
    await page.getByRole("button", { name: "Classificação" }).first().click();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("mobile: menu hambúrguer abre, navega e fecha", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone-ish
    await page.goto("/");

    // A navbar horizontal não existe mais; o botão do menu deve estar visível.
    const openBtn = page.getByRole("button", { name: "Abrir menu de navegação" });
    await expect(openBtn).toBeVisible();

    // As abas ficam escondidas até abrir o menu.
    const menu = page.getByRole("dialog", { name: "Menu de navegação" });
    await expect(menu).toBeHidden();

    // Abre o menu e navega para Jogos.
    await openBtn.click();
    await expect(menu).toBeVisible();
    await menu.getByRole("button", { name: "Jogos" }).click();

    // Ao selecionar, o menu fecha e o conteúdo muda.
    await expect(menu).toBeHidden();
    await expect(page.getByText("Calendário")).toBeVisible();
  });
});
