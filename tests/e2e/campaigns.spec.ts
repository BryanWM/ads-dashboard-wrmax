import { expect, test } from "@playwright/test";

test.describe("campaigns table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/campaigns?client=demo-auto-center");
  });

  test("keeps missing values last when sorting in either direction", async ({ page }) => {
    const header = page.getByRole("button", { name: "Resultados", exact: true });
    const lastRowResults = page.locator("tbody tr").last().locator("td").nth(8);

    await header.click(); // descending first for numbers
    await expect(lastRowResults).toHaveText("—");
    await header.click(); // ascending
    await expect(lastRowResults).toHaveText("—");
  });

  test("filters by name and status", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Buscar campanha" }).fill("pneus");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Buscar campanha" }).fill("");
    await page.getByRole("button", { name: "Pausadas" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("Pausada");
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Buscar campanha" }).fill("inexistente");
    await expect(page.getByText("Nenhuma campanha encontrada")).toBeVisible();
  });
});
