import { expect, test, type Page } from "@playwright/test";

/** Phones/tablets show tabs; desktop shows the same content as bento panels. */
async function openTab(page: Page, isMobile: boolean, name: "Funil" | "Anúncios" | "Detalhes") {
  if (isMobile)
    await page.getByRole("group", { name: "Seções" }).getByRole("button", { name }).click();
}

test.describe("overview (simulated data)", () => {
  test("login page offers the demo and validates input without sending it", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await page.getByRole("button", { name: "Explorar com dados simulados" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("always labels simulated data", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("status").filter({ hasText: "Dados simulados" })).toBeVisible();
  });

  test("answers 'is it working?' in one sentence and four numbers", async ({ page }) => {
    await page.goto("/dashboard?client=demo-pizzaria&period=last_7d");
    const summary = page.getByRole("region", { name: "Resumo do período" });
    await expect(summary).toContainText(/Nos últimos 7 dias, R\$ .+ investidos geraram .+ compras/);
    const cards = page.getByRole("button", { name: /Ver detalhes$/ });
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(3)).toHaveAccessibleName(/^Retorno: .+x/);
  });

  test("changes the period with the chips", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("group", { name: "Período" })
      .getByRole("button", { name: "30 dias" })
      .click();
    await expect(page).toHaveURL(/period=last_30d/);
    await expect(page.getByRole("region", { name: "Resumo do período" })).toContainText(
      "Nos últimos 30 dias",
    );
  });

  test("opens the details sheet when a number is tapped", async ({ page }) => {
    await page.goto("/dashboard?client=demo-pizzaria");
    await page.getByRole("button", { name: /^Custo por compra:/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Quanto custou, em média, cada resultado.")).toBeVisible();
    await expect(sheet.getByText("Custo por clique")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("never sums different objectives into the main result", async ({ page, isMobile }) => {
    await page.goto("/dashboard?client=demo-auto-center&period=last_7d");
    await expect(page.getByRole("region", { name: "Resumo do período" })).toContainText(
      "investidos em campanhas de cadastros",
    );
    // Not a sales client: the 4th card is reach, never an invented ROAS.
    await expect(page.getByRole("button", { name: /^Pessoas alcançadas:/ })).toBeVisible();
    await openTab(page, isMobile, "Detalhes");
    await expect(page.getByText("Resultados por tipo").first()).toBeVisible();
  });

  test("shows the sales funnel and winning ads for the sales demo", async ({ page, isMobile }) => {
    await page.goto("/dashboard?client=demo-pizzaria");
    await openTab(page, isMobile, "Funil");
    await expect(page.getByText("Pagamento").first()).toBeVisible();
    await openTab(page, isMobile, "Anúncios");
    await expect(page.getByText("Pizza saindo do forno").first()).toBeVisible();
  });

  test("explains a failing sync and keeps the last valid data", async ({ page }) => {
    await page.goto("/dashboard?client=demo-clinica&period=last_7d");
    await expect(page.getByText("A última atualização falhou")).toBeVisible();
  });

  test("shows an actionable empty state for a client without accounts", async ({ page }) => {
    await page.goto("/dashboard?client=demo-imobiliaria");
    await expect(page.getByText("Nenhuma conta de anúncios vinculada")).toBeVisible();
  });

  test("ignores an unknown client id instead of failing or echoing it", async ({ page }) => {
    const response = await page.goto("/dashboard?client=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pizzaria Demonstração");
    expect(await page.content()).not.toContain("<script>alert(1)</script>");
  });
});

test.describe("mobile layout criteria", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("header, summary and the 4 numbers fit the first screen without horizontal scroll", async ({
    page,
  }) => {
    await page.goto("/dashboard?client=demo-pizzaria&period=last_7d");
    const cards = page.getByRole("button", { name: /Ver detalhes$/ });
    await expect(cards).toHaveCount(4);
    const lastCard = await cards.nth(3).boundingBox();
    expect(lastCard!.y + lastCard!.height).toBeLessThanOrEqual(844);
    const { scrollWidth, height } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(390);
    expect(height).toBeLessThanOrEqual(844 * 2);
  });
});
