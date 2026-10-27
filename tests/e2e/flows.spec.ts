import { test, expect, type Page } from "@playwright/test";
import { localDate } from "../../lib/availability";
const isolated = !!process.env.TEST_DATABASE_SCHEMA;
const future = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return localDate(d);
};
async function login(page: Page) {
  await page.goto("/admin/login");
  await page
    .getByLabel("Usuario", { exact: true })
    .fill(process.env.ADMIN_USERNAME!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test.describe("isolated booking and administration", () => {
  test.skip(
    !isolated,
    "Use pnpm test:full to create a disposable Neon schema.",
  );
  test("cash booking and quote booking create confirmations", async ({
    page,
  }) => {
    for (const [service, day] of [
      ["test-fixed", 6],
      ["test-quote", 7],
    ] as const) {
      await page.goto(`/agendar?servicio=${service}`);
      await page.getByLabel("Fecha", { exact: true }).fill(future(day));
      await page.getByRole("button", { name: "10:00", exact: true }).click();
      await page.getByLabel("Nombre", { exact: true }).fill("Cliente E2E");
      await page.getByLabel("Teléfono", { exact: true }).fill("528100000000");
      await page.locator('input[name="consent"]').check();
      await page.getByRole("button", { name: "Confirmar cita" }).click();
      await expect(page).toHaveURL(/\/cita\/[\w-]{43}$/);
      await expect(page.locator(".status")).toHaveText("Confirmada");
      if (service === "test-quote") {
        await expect(page.locator(".summary-total")).toContainText(
          "Se cotiza por WhatsApp",
        );
        await expect(page.locator(".summary-total")).not.toContainText("$0");
      } else await expect(page.locator(".summary-total")).toContainText("$350");
    }
  });
  test("admin schedule, service edits, blocks, manual booking and rescheduling", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/horarios");
    await page.locator('input[name="day-1"]').fill("09:00-13:00, 15:00-19:00");
    await page.getByRole("button", { name: "Guardar horario semanal" }).click();
    await expect(page.getByRole("status")).toContainText("Horarios guardados");
    await page.goto("/admin/servicios");
    const service = page.locator("details").filter({
      has: page.locator("summary").filter({ hasText: "Corte de prueba" }),
    });
    await service.locator("summary").click();
    await service.locator('input[name="price"]').fill("375");
    await service.getByRole("button", { name: "Guardar servicio" }).click();
    await expect(page.getByRole("status")).toContainText("Cambios guardados");
    const date = future(8);
    await page.goto(`/admin/bloqueos?fecha=${date}`);
    await page.getByLabel("Hora inicial", { exact: true }).fill("12:00");
    await page.getByLabel("Hora final", { exact: true }).fill("14:00");
    await page.getByLabel("Motivo", { exact: true }).fill("Bloqueo E2E");
    await page.getByRole("button", { name: "Guardar bloqueo" }).click();
    await expect(page.getByRole("status")).toContainText("Bloqueo guardado");
    await page.goto(`/admin/calendario?fecha=${date}&servicio=test-fixed`);
    await expect(page.locator(".calendar-block")).toContainText("Bloqueo E2E");
    await expect(
      page.locator(".admin-slots summary").filter({ hasText: "12:00" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/qa/admin-calendar-1440.png",
      fullPage: true,
    });
    await page.goto(
      `/admin/citas/nueva?fecha=${date}&hora=10:00&servicio=test-fixed`,
    );
    await page.getByRole("button", { name: "10:00", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Cita manual E2E");
    await page.getByLabel("Teléfono", { exact: true }).fill("528100000000");
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Confirmar cita" }).click();
    await expect(page).toHaveURL(/admin\/citas\?ok/);
    const row = page.getByRole("row").filter({ hasText: "Cita manual E2E" });
    await row.getByRole("link", { name: /EG-/ }).click();
    await page.getByText("Reprogramar cita", { exact: true }).click();
    await page.getByLabel("Nueva fecha", { exact: true }).fill(future(9));
    await page.getByLabel("Nueva hora", { exact: true }).fill("10:00");
    await page.getByRole("button", { name: "Guardar nueva fecha" }).click();
    await expect(page.getByRole("status")).toContainText("Cita reprogramada");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/qa/admin-390.png",
      fullPage: true,
    });
  });
  test("booking origin and webhook signatures are enforced", async ({
    request,
  }) => {
    const badOrigin = await request.post("/api/bookings", {
      headers: { Origin: "https://invalid.example" },
      data: {},
    });
    expect(badOrigin.status()).toBe(400);
    const signature = await request.post(
      "/api/webhooks/mercadopago?data.id=1234",
      { headers: { "x-signature": "ts=1,v1=invalid" } },
    );
    expect(signature.status()).toBe(401);
  });
});
