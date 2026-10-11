import { expect, test } from "@playwright/test";

test.describe("client view (demo session)", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "wrmax_demo_viewer", value: "client", url: baseURL! }]);
  });

  test("shows only the client's own reports, without the admin menu", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Auto Center Modelo");
    if (isMobile) await page.getByRole("button", { name: "Mostrar ou ocultar menu" }).click();
    await expect(page.getByRole("link", { name: "Campanhas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Integrações" })).toHaveCount(0);
    await expect(
      page.getByText("Visão do cliente").or(page.getByText("Cliente", { exact: true })),
    ).toBeVisible();
  });

  test("cannot open another client's data by editing the URL", async ({ page }) => {
    await page.goto("/dashboard?client=demo-clinica");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Auto Center Modelo");
    await expect(page.locator("body")).not.toContainText("Clínica Exemplo");
  });

  test("is refused by the admin area on the server", async ({ page }) => {
    for (const path of ["/admin", "/admin/access", "/admin/audit"]) {
      await page.goto(path);
      await expect(page.getByText("Acesso restrito")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("ana@example.com");
    }
  });

  test("switches back to the agency view from the user menu", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    if (isMobile) await page.getByRole("button", { name: "Mostrar ou ocultar menu" }).click();
    await page.getByRole("button", { name: /Carla/ }).click();
    await page.getByRole("menuitem", { name: "Voltar para a visão da agência" }).click();
    await expect(page.getByRole("link", { name: "Integrações" })).toBeVisible();
  });
});
