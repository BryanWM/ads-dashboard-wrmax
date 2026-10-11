import { expect, test } from "@playwright/test";

test.describe("navigation", () => {
  test("carries client and period across client pages", async ({ page, isMobile }) => {
    await page.goto("/dashboard?client=demo-clinica&period=last_14d");
    if (isMobile) {
      await page.getByRole("button", { name: "Mostrar ou ocultar menu" }).click();
    }
    await page.getByRole("link", { name: "Campanhas" }).click();
    await expect(page).toHaveURL(/\/campaigns\?client=demo-clinica&period=last_14d/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Campanhas");
  });

  test("switches client from the sidebar", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    if (isMobile) {
      await page.getByRole("button", { name: "Mostrar ou ocultar menu" }).click();
    }
    await page.getByRole("button", { name: /Pizzaria Demonstração/ }).click();
    await page.getByRole("menuitem", { name: /Clínica Exemplo/ }).click();
    await expect(page).toHaveURL(/client=demo-clinica/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clínica Exemplo");
  });

  test("menus with labels open without runtime errors", async ({ page }) => {
    // Regression: Base UI throws when a menu label sits outside a group.
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/design-system");
    await page.getByRole("button", { name: "Ações" }).click();
    await expect(page.getByRole("menuitem", { name: "Sincronizar agora" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("admin pages render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    for (const path of [
      "/admin",
      "/admin/clients",
      "/admin/ad-accounts",
      "/admin/sync",
      "/admin/access",
      "/admin/audit",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
