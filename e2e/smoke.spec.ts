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
    // A área do organizador fica em /admin (fora do menu) e pede login.
    await page.goto("/admin");
    await page.getByLabel("Token de acesso").fill("dev-token-troque-isto");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Painel do Organizador" })).toBeVisible();

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

    // Volta ao portal: a classificação segue renderizando.
    await page.goto("/");
    await page.getByRole("button", { name: "Classificação" }).first().click();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("abre a aba Times e renderiza o elenco (regressão: tela preta)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Times" }).first().click();
    // A tela de Times chegou a quebrar com tela preta (crash de render por
    // acessar squad.players quando o fallback era a lista). Garante que renderiza.
    await expect(page.getByRole("heading", { name: "Elenco" })).toBeVisible();
    await expect(page.getByText("Goleiro").first()).toBeVisible();
  });

  test("admin fica em /admin e exige login válido (fora do menu)", async ({ page }) => {
    await page.goto("/");
    // Não há mais aba Admin no menu do portal.
    await expect(page.getByRole("button", { name: "Admin" })).toHaveCount(0);
    // /admin mostra o login; token errado não libera.
    await page.goto("/admin");
    await expect(page.getByText("Área do Organizador")).toBeVisible();
    await page.getByLabel("Token de acesso").fill("errado");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Painel do Organizador" })).toHaveCount(0);
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
