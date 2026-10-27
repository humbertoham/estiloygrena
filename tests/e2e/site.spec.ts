import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("public routes and photography render", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Estilo y Greña", exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator(".poster-wall img")).toHaveCount(24);
  for (const path of [
    "/servicios",
    "/galeria",
    "/calendario",
    "/agendar",
    "/ubicacion",
    "/privacidad",
    "/politica-de-cancelacion",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});
test("desktop and mobile layout screenshots", async ({ page }) => {
  await mkdir("artifacts/qa", { recursive: true });
  for (const [w, h] of [
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.locator(".hero-poster").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .locator(".poster-wall img")
          .first()
          .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/qa/home-${w}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/agendar");
  await expect(
    page.locator('.booking-layout form[data-ready="true"]'),
  ).toBeVisible();
  await expect(
    page.locator('.booking-layout [aria-busy="false"]'),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/qa/booking-390.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("mobile menu and gallery dialog are usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator(".mobile-menu summary").click();
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Nuestros trabajos" })
    .click();
  await expect(page).toHaveURL(/galeria/);
  await page.locator(".gallery-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("admin is protected and rejects invalid login", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel("Usuario", { exact: true }).fill("invalid");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.locator(".feedback.error")).toContainText(
    "No se pudo iniciar sesión",
  );
  const r = await request.post("/api/admin/bookings", { data: {} });
  expect(r.status()).toBe(401);
  const upload = await request.get(
    "/api/admin/availability?service=x&date=2026-11-03",
  );
  expect(upload.status()).toBe(401);
});
