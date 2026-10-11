import { expect, test } from "@playwright/test";

test.describe("dashboard (simulated data)", () => {
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

  test("changes the period through the URL and recomputes the comparison", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Período:/ }).click();
    await page.getByRole("button", { name: "Últimos 7 dias" }).click();
    await expect(page).toHaveURL(/period=last_7d/);
    await expect(page.getByRole("button", { name: "Período: Últimos 7 dias" })).toBeVisible();
  });

  test("never sums different result types", async ({ page }) => {
    await page.goto("/dashboard?client=demo-auto-center");
    await expect(
      page.getByText("Tipos de resultado diferentes — veja abaixo").first(),
    ).toBeVisible();
    await expect(page.getByText("Resultados por tipo")).toBeVisible();
  });

  test("explains a failing sync and keeps the last valid data", async ({ page }) => {
    await page.goto("/dashboard?client=demo-clinica&period=last_7d");
    await expect(page.getByText("A última atualização falhou")).toBeVisible();
    await expect(page.getByText(/Período parcial: há dados até/)).toBeVisible();
  });

  test("shows an actionable empty state for a client without accounts", async ({ page }) => {
    await page.goto("/dashboard?client=demo-imobiliaria");
    await expect(page.getByText("Nenhuma conta de anúncios vinculada")).toBeVisible();
  });

  test("ignores an unknown client id instead of failing or echoing it", async ({ page }) => {
    const response = await page.goto("/dashboard?client=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Auto Center Modelo");
    expect(await page.content()).not.toContain("<script>alert(1)</script>");
  });
});
