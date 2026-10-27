import { describe, it, expect } from "vitest";
import { serviceSchema, bookingSchema, dateSchema } from "../../lib/validation";
import { whatsappLink } from "../../lib/constants";
const service = {
  name: "Prueba",
  slug: "prueba",
  description: "",
  pricingType: "QUOTE",
  priceCents: null,
  quoteLabel: "Por cotizar",
  durationMinutes: 180,
  displayOrder: 0,
  isActive: true,
};
describe("pricing and validation", () => {
  it("requires null quote amount", () => {
    expect(serviceSchema.safeParse(service).success).toBe(true);
    expect(serviceSchema.safeParse({ ...service, priceCents: 0 }).success).toBe(
      false,
    );
  });
  it("requires positive fixed amount", () => {
    expect(
      serviceSchema.safeParse({
        ...service,
        pricingType: "FIXED",
        priceCents: 35000,
      }).success,
    ).toBe(true);
    expect(
      serviceSchema.safeParse({ ...service, pricingType: "FIXED" }).success,
    ).toBe(false);
  });
  it("validates real dates", () => {
    expect(dateSchema.safeParse("2026-02-31").success).toBe(false);
    expect(dateSchema.safeParse("2026-11-03").success).toBe(true);
  });
  it("requires consent and phone", () =>
    expect(bookingSchema.safeParse({}).success).toBe(false));
  it("does not invent WhatsApp contact", () =>
    expect(whatsappLink("", "Hola")).toBe(null));
  it("encodes quotation links", () =>
    expect(whatsappLink("528112345678", "Hola, Color Fantasía")).toContain(
      encodeURIComponent("Hola, Color Fantasía"),
    ));
});
