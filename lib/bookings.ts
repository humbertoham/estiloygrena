import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { bookingSchema } from "./validation";
import { availability, calendarLock, expireHolds } from "./scheduling";
import { hash } from "./security";
import { createPreference } from "./payments";
export async function reserve(raw: unknown, admin = false) {
  const input = bookingSchema.parse(raw),
    token = randomBytes(32).toString("base64url");
  const appointment = await db.$transaction(
    async (tx) => {
      await calendarLock(tx);
      await expireHolds(tx);
      const slots = await availability(
        tx,
        input.serviceId,
        input.date,
        undefined,
        undefined,
        admin,
      );
      if (!slots.some((s) => s.toISOString() === input.startAt))
        throw new Error("Ese horario ya no está disponible. Elige otro.");
      const service = await tx.service.findUniqueOrThrow({
        where: { id: input.serviceId },
      });
      if (service.pricingType === "QUOTE" && input.paymentMethod !== "QUOTE")
        throw new Error("Este servicio requiere cotización.");
      if (service.pricingType === "FIXED" && input.paymentMethod === "QUOTE")
        throw new Error("Selecciona una forma de pago.");
      const startAt = new Date(input.startAt),
        online = input.paymentMethod === "MERCADO_PAGO";
      return tx.appointment.create({
        data: {
          id: randomUUID(),
          bookingCode: `EG-${randomBytes(5).toString("hex").toUpperCase()}`,
          publicTokenHash: hash(token),
          serviceId: service.id,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email || null,
          instagram: input.instagram || null,
          notes: input.notes || null,
          serviceNameSnapshot: service.name,
          servicePricingTypeSnapshot: service.pricingType,
          servicePriceSnapshot: service.priceCents,
          serviceQuoteLabelSnapshot: service.quoteLabel,
          serviceDurationSnapshot: service.durationMinutes,
          amountCents: service.priceCents,
          startAt,
          endAt: new Date(+startAt + service.durationMinutes * 60000),
          status: online ? "PENDING" : "CONFIRMED",
          paymentMethod: input.paymentMethod,
          paymentStatus:
            service.pricingType === "QUOTE" ? "NOT_REQUIRED" : "PENDING",
          pendingExpiresAt: online ? new Date(Date.now() + 15 * 60000) : null,
        },
      });
    },
    { timeout: 20000 },
  );
  if (appointment.paymentMethod === "MERCADO_PAGO") {
    try {
      const checkout = await createPreference(appointment, token);
      await db.appointment.update({
        where: { id: appointment.id },
        data: { paymentPreferenceId: checkout.id },
      });
      return { token, checkoutUrl: checkout.url };
    } catch {
      await db.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
      });
      throw new Error(
        "No se pudo iniciar el pago. El horario fue liberado; intenta de nuevo o paga en el local.",
      );
    }
  }
  return { token, checkoutUrl: null };
}
