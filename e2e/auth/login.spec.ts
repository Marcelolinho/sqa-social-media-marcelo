import { test, expect, Page } from "@playwright/test";
import { makeUser } from "../helpers/user.factory";
import { seedUser } from "../helpers/api";

function emailInput(page: Page) {
  return page.getByPlaceholder("seu@email.com");
}

function passwordInput(page: Page) {
  return page.getByPlaceholder("••••••••");
}

function submitBtn(page: Page) {
  return page.locator('button[type="submit"]:has-text("Entrar")');
}

test.describe("Login (/signin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signin");
  });

  test("happy path: logs in with valid credentials", async ({ page, request }) => {
    await emailInput(page).fill("pedroprofessor@email.com");
    await passwordInput(page).fill("Senha@123");
    await submitBtn(page).click();

    await expect(page).toHaveURL("/");
    const stored = await page.evaluate(() => localStorage.getItem("user"));
    expect(stored).toContain("pedroprofessor@email.com");
  });

  test("wrong password: shows invalid-credentials error", async ({ page, request }) => {
    await emailInput(page).fill("pedroprofessor@email.com");
    await passwordInput(page).fill("Naovaidarcerto@999");
    await submitBtn(page).click();

    await expect(page.getByText("Credenciais inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("non-existent user: shows invalid-credentials error", async ({ page }) => {
    const ghost = makeUser();

    await emailInput(page).fill(ghost.email);
    await passwordInput(page).fill(ghost.password);
    await submitBtn(page).click();

    await expect(page.getByText("Credenciais inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("empty fields: required-field errors appear", async ({ page }) => {
    await submitBtn(page).click();

    await expect(page.getByText("Email é obrigatório")).toBeVisible();
    await expect(page.getByText("Senha é obrigatória")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("session persistence: user data survives a reload in storage", async ({
    page,
    request,
  }) => {
    await emailInput(page).fill("pedroprofessor@email.com");
    await passwordInput(page).fill("Senha@123");
    await submitBtn(page).click();
    await expect(page).toHaveURL("/");

    await page.reload();

    const stored = await page.evaluate(() => localStorage.getItem("user"));
    expect(stored).toContain("pedroprofessor@email.com");
  });
});
