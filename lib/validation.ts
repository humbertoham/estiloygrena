import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Fecha inválida",
  );
export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  date: dateSchema,
  startAt: z.iso.datetime(),
  customerName: z.string().trim().min(2, "Escribe tu nombre").max(100),
  phone: z
    .string()
    .transform((s) => s.replace(/[^\d+]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\+?\d{10,15}$/, "Escribe un teléfono de 10 a 15 dígitos"),
    ),
  email: z.union([z.email(), z.literal("")]).optional(),
  instagram: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(["CASH", "MERCADO_PAGO", "QUOTE"]),
  consent: z.literal(true, { error: "Acepta el aviso de privacidad" }),
});
export type BookingInput = z.infer<typeof bookingSchema>;
export const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().max(1000),
    pricingType: z.enum(["FIXED", "QUOTE"]),
    priceCents: z.number().int().positive().nullable(),
    quoteLabel: z.string().max(120).nullable(),
    durationMinutes: z.number().int().min(15).max(720),
    displayOrder: z.number().int().min(0).max(1000),
    isActive: z.boolean(),
    imageUrl: z
      .union([z.url().refine((v) => v.startsWith("https://")), z.literal("")])
      .optional(),
  })
  .superRefine((s, c) => {
    if (
      (s.pricingType === "QUOTE" && s.priceCents !== null) ||
      (s.pricingType === "FIXED" && s.priceCents === null)
    )
      c.addIssue({
        code: "custom",
        message: "Revisa el tipo de precio y el importe",
        path: ["priceCents"],
      });
  });
