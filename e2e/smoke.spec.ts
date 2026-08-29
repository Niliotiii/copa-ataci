import { test, expect } from "@playwright/test";

test.describe("Copa Ataci — smoke E2E", () => {

  test("roteamento por path: deep-links, navegação e histórico", async ({ page }) => {
    // Deep-links diretos (SPA fallback serve o index.html em qualquer path).
    await page.goto("/jogos");
    await expect(page.getByText("Calendário")).toBeVisible();
    await page.goto("/artilharia");
    await expect(page.getByRole("heading", { name: "Artilharia" })).toBeVisible();
    await page.goto("/mata-mata");
    await expect(page.getByText("Quartas")).toBeVisible();
    await page.goto("/times/ATA");
    await expect(page.getByText("ATACI FC")).toBeVisible();

    // Clicar navega e muda a URL; voltar do navegador funciona.
    await page.getByRole("button", { name: /Todos os times/ }).click();
    await expect(page).toHaveURL(/\/times$/);
    await page.getByRole("button", { name: "Jogos" }).first().click();
    await expect(page).toHaveURL(/\/jogos$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/times$/);
  });
  test("artilharia mostra artilheiros do seed (não vazia)", async ({ page }) => {
    await page.goto("/artilharia");
    await expect(page.getByRole("table")).toBeVisible();
    // O seed traz eventos da Rodada 1; deve haver ao menos um artilheiro.
    await expect(page.getByRole("row").nth(1)).toBeVisible();
  });

  test("navega pelas abas e mostra a classificação calculada", async ({ page }) => {
    await page.goto("/");

    // A classificação é a aba inicial; deve renderizar a tabela com o líder ATA.
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Ataci FC").first()).toBeVisible();

    // Navega para Jogos.
    await page.getByRole("button", { name: "Jogos" }).first().click();
    await expect(page.getByText("Calendário")).toBeVisible();

    // O mata-mata agora é uma sub-aba dentro de Classificação.
    await page.getByRole("button", { name: "Classificação" }).first().click();
    await page.getByRole("button", { name: "Mata-Mata" }).click();
    await expect(page.getByText("Quartas")).toBeVisible();
  });

  test("admin: gols/cartões vêm dos eventos (formulário do jogo sem placar)", async ({ page }) => {
    // A área do organizador fica em /admin (fora do menu) e pede login.
    await page.goto("/admin");
    await page.getByLabel("Token de acesso").fill("dev-token-troque-isto");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Organizador", exact: true })).toBeVisible();

    // Seleciona o jogo ATA x LEO (Rodada 2) pelo Select customizado.
    await page.getByRole("button", { name: "Jogo", exact: true }).click();
    await page.getByRole("option", { name: /\[R2\] Ataci FC × Leões/ }).click();

    // Gols e cartões agora vêm dos EVENTOS por jogador (unificado): o formulário
    // do jogo não tem mais campos de placar/cartões, e a seção de eventos aparece.
    await expect(page.getByRole("heading", { name: "Eventos por jogador" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar eventos" })).toBeVisible();
    // Não há mais input de "Gols casa" no formulário do jogo.
    await expect(page.getByText("Gols casa")).toHaveCount(0);
  });

  test("abre a aba Times: lista → prancheta interativa (campo + banco)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Times" }).first().click();
    // Primeiro a lista de times; clicar num time abre a prancheta.
    await page.getByRole("button", { name: /Ver elenco de Ataci FC/ }).click();
    // A prancheta pública mostra o botão de limpar campo.
    await expect(page.getByRole("button", { name: "Limpar campo" })).toBeVisible();
    // "Limpar campo" manda todos para o banco (fica desabilitado depois).
    await page.getByRole("button", { name: "Limpar campo" }).click();
    await expect(page.getByRole("button", { name: "Limpar campo" })).toBeDisabled();
    // Compartilhar abre o modal de escalação.
    await page.getByRole("button", { name: "Compartilhar escalação" }).click();
    await expect(page.getByRole("dialog", { name: "Compartilhar Escalação" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();
    // Voltar à lista.
    await page.getByRole("button", { name: /Todos os times/ }).click();
    await expect(page.getByRole("button", { name: /Ver elenco de Leões/ })).toBeVisible();
  });

  test("times mobile: página rola com o campo grande; arrasto (mouse) move o jogador", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/times/ATA");
    await expect(page.getByRole("button", { name: "Limpar campo" })).toBeVisible();

    // A página deve poder rolar (o conteúdo é mais alto que a viewport).
    const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
    expect(scrollable).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 400));
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(100);

    // Arrasto com mouse reposiciona um jogador (mouse ativa de imediato).
    await page.evaluate(() => window.scrollTo(0, 0));
    const marker = page.locator('[title*="segure e arraste"]').first();
    const before = await marker.boundingBox();
    if (!before) throw new Error("sem jogador em campo");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 90, before.y + before.height / 2, { steps: 8 });
    await page.mouse.up();
    const after = await page.locator('[title*="segure e arraste"]').first().boundingBox();
    expect(after && Math.abs(after.x - before.x) > 20).toBe(true);
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
    await expect(page.getByRole("heading", { name: "Organizador", exact: true })).toHaveCount(0);
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
