import { createHmac, timingSafeEqual } from "node:crypto";
import type { Appointment } from "./generated/prisma/client";
import { db } from "./db";
import { calendarLock, expireHolds } from "./scheduling";
import { paymentDecision } from "./payment-state";
import { z } from "zod";
const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  currency_id: z.literal("MXN"),
  transaction_amount: z.number().positive(),
  external_reference: z.string().min(1),
  status: z.enum([
    "pending",
    "in_process",
    "authorized",
    "approved",
    "rejected",
    "cancelled",
    "refunded",
    "charged_back",
  ]),
  date_last_updated: z.iso.datetime({ offset: true }),
});
function accessToken() {
  const t = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Mercado Pago no está configurado");
  return t;
}
async function mp(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Error de Mercado Pago");
  return response.json();
}
export function paymentsEnabled() {
  return (
    !!process.env.MERCADO_PAGO_ACCESS_TOKEN &&
    !!process.env.MERCADO_PAGO_WEBHOOK_SECRET &&
    !!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") &&
    (process.env.MERCADO_PAGO_ACCESS_TOKEN.startsWith("TEST-") ||
      process.env.ALLOW_LIVE_PAYMENTS === "true")
  );
}
export async function createPreference(a: Appointment, token: string) {
  if (
    a.servicePricingTypeSnapshot !== "FIXED" ||
    !a.amountCents ||
    !paymentsEnabled()
  )
    throw new Error("El pago en línea no está disponible");
  const origin = process.env.NEXT_PUBLIC_APP_URL!;
  const result = await mp("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": a.id },
    body: JSON.stringify({
      items: [
        {
          id: a.serviceId,
          title: a.serviceNameSnapshot,
          quantity: 1,
          currency_id: "MXN",
          unit_price: a.amountCents / 100,
        },
      ],
      external_reference: a.id,
      notification_url: `${origin}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${origin}/pago/exito?cita=${token}`,
        pending: `${origin}/pago/pendiente?cita=${token}`,
        failure: `${origin}/pago/error?cita=${token}`,
      },
      auto_return: "approved",
      expires: true,
      expiration_date_from: a.createdAt.toISOString(),
      expiration_date_to: a.pendingExpiresAt!.toISOString(),
    }),
  });
  return {
    id: String(result.id),
    url: process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith("TEST-")
      ? result.sandbox_init_point
      : result.init_point,
  } as { id: string; url: string };
}
export function validSignature(
  id: string,
  requestId: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const values = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=")),
  );
  const { ts, v1 } = values;
  if (
    !ts ||
    !/^\d+$/.test(ts) ||
    !v1 ||
    !/^([a-f0-9]{64})$/i.test(v1) ||
    !requestId ||
    !id
  )
    return false;
  const time = Number(ts) * (ts.length <= 10 ? 1000 : 1);
  if (Math.abs(now - time) > 15 * 60000) return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}
export async function processPayment(id: string) {
  const p = paymentSchema.parse(
    await mp(`/v1/payments/${encodeURIComponent(id)}`),
  );
  if (
    String(p.id) !== id ||
    p.currency_id !== "MXN" ||
    typeof p.transaction_amount !== "number" ||
    !p.external_reference
  )
    throw new Error("Pago no válido");
  await db.$transaction(
    async (tx) => {
      await calendarLock(tx);
      await expireHolds(tx);
      const eventId = `${p.id}:${p.status}:${p.date_last_updated}`;
      if (
        await tx.paymentEvent.findUnique({
          where: { externalEventId: eventId },
        })
      )
        return;
      const a = await tx.appointment.findUnique({
        where: { id: p.external_reference },
      });
      if (
        !a ||
        a.paymentMethod !== "MERCADO_PAGO" ||
        a.amountCents !== Math.round(p.transaction_amount * 100)
      )
        throw new Error("El importe o la referencia del pago no coincide");
      const decision = paymentDecision(a, p.status);
      const providerUpdatedAt = new Date(p.date_last_updated);
      const previous = await tx.paymentTransaction.findUnique({
        where: { paymentId: id },
      });
      if (previous && previous.appointmentId !== a.id)
        throw new Error("La referencia del pago cambió");
      const history = await tx.paymentEvent.findMany({
        where: {
          paymentId: id,
          eventType: { notIn: ["STALE_EVENT", "ADMIN_RECONCILIATION"] },
        },
        select: { payload: true },
      });
      const latestProviderTime = Math.max(
        0,
        ...history.map((e) => {
          const payload = e.payload as { updatedAt?: string };
          return payload.updatedAt ? Date.parse(payload.updatedAt) || 0 : 0;
        }),
      );
      const stale =
        previous &&
        (latestProviderTime > +providerUpdatedAt ||
          (previous.status === "approved" &&
            ["pending", "in_process", "authorized"].includes(p.status)));
      if (stale) {
        await tx.paymentEvent.create({
          data: {
            externalEventId: eventId,
            eventType: "STALE_EVENT",
            paymentId: id,
            payload: { id, status: p.status, updatedAt: p.date_last_updated },
          },
        });
        return;
      }
      await tx.paymentTransaction.upsert({
        where: { paymentId: id },
        create: {
          paymentId: id,
          appointmentId: a.id,
          status: p.status,
          amountCents: Math.round(p.transaction_amount * 100),
          currency: p.currency_id,
        },
        update: { status: p.status },
      });
      const transactions = await tx.paymentTransaction.findMany({
        where: { appointmentId: a.id },
      });
      const approved = transactions.filter((t) => t.status === "approved");
      const paymentStatus = approved.length
        ? "PAID"
        : transactions.some((t) => t.status === "refunded")
          ? "REFUNDED"
          : transactions.some((t) =>
                ["rejected", "cancelled", "charged_back"].includes(t.status),
              )
            ? "FAILED"
            : "PENDING";
      const duplicateApproved = approved.length > 1;
      await tx.appointment.update({
        where: { id: a.id },
        data: {
          paymentStatus,
          paymentId: approved[0]?.paymentId || a.paymentId || id,
          needsReview:
            a.needsReview ||
            decision.review ||
            duplicateApproved ||
            p.status === "charged_back",
          ...(decision.confirm
            ? { status: "CONFIRMED", pendingExpiresAt: null }
            : {}),
          ...(["rejected", "cancelled", "refunded"].includes(p.status) &&
          paymentStatus !== "PAID" &&
          (a.status === "PENDING" ||
            (p.status === "refunded" && a.status === "CONFIRMED"))
            ? { status: "CANCELLED" }
            : {}),
        },
      });
      await tx.paymentEvent.create({
        data: {
          externalEventId: eventId,
          eventType: p.status,
          paymentId: id,
          payload: {
            id: String(p.id),
            status: p.status,
            updatedAt: p.date_last_updated,
          },
        },
      });
    },
    { timeout: 20000 },
  );
}
