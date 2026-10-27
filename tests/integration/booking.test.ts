import { beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { db } from "../../lib/db";
import { reserve } from "../../lib/bookings";
import { availability, expireHolds } from "../../lib/scheduling";
import { localDate, zoned, localTime } from "../../lib/availability";
import { processPayment } from "../../lib/payments";
const run = process.env.TEST_DATABASE_SCHEMA?.startsWith("estilo_test_");
const date = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 5);
  return localDate(d);
})();
let serviceId = "",
  quoteId = "";
describe.skipIf(!run)("isolated Neon integration", () => {
  beforeEach(async () => {
    await db.paymentEvent.deleteMany();
    await db.paymentTransaction.deleteMany();
    await db.appointment.deleteMany();
    await db.blockedPeriod.deleteMany();
    await db.scheduleException.deleteMany();
    await db.weeklySchedule.deleteMany();
    await db.service.deleteMany();
    await db.siteSetting.deleteMany();
    for (const weekday of [0, 1, 2, 3, 4, 5, 6])
      await db.weeklySchedule.create({
        data: { weekday, startTime: "08:00", endTime: "20:00" },
      });
    for (const [key, value] of Object.entries({
      bookingEnabled: "true",
      advanceNoticeMinutes: "0",
      bookingInterval: "60",
    }))
      await db.siteSetting.create({ data: { key, value } });
    serviceId = (
      await db.service.create({
        data: {
          name: "Prueba fija",
          slug: "prueba-fija",
          description: "Test only",
          pricingType: "FIXED",
          priceCents: 35000,
          durationMinutes: 60,
        },
      })
    ).id;
    quoteId = (
      await db.service.create({
        data: {
          name: "Prueba cotización",
          slug: "prueba-cotizacion",
          description: "Test only",
          pricingType: "QUOTE",
          priceCents: null,
          quoteLabel: "Se cotiza por WhatsApp",
          durationMinutes: 180,
        },
      })
    ).id;
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    await db.$disconnect();
  });
  const booking = (id = serviceId, time = "10:00", method = "CASH") => ({
    serviceId: id,
    date,
    startAt: zoned(date, time).toISOString(),
    customerName: "Cliente de prueba",
    phone: "528100000000",
    paymentMethod: method,
    consent: true,
  });
  it("prevents concurrent overlapping bookings at transaction and database level", async () => {
    const results = await Promise.allSettled([
      reserve(booking()),
      reserve(booking()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.appointment.count()).toBe(1);
    const a = await db.appointment.findFirstOrThrow();
    await expect(
      db.appointment.create({
        data: {
          ...a,
          id: "overlap",
          bookingCode: "EG-OVERLAP",
          publicTokenHash: null,
        },
      }),
    ).rejects.toThrow();
  });
  it("books fixed price with immutable historical snapshot", async () => {
    await reserve(booking());
    await db.service.update({
      where: { id: serviceId },
      data: { priceCents: 90000, durationMinutes: 120 },
    });
    const a = await db.appointment.findFirstOrThrow();
    expect(a.amountCents).toBe(35000);
    expect(a.serviceDurationSnapshot).toBe(60);
    expect(a.status).toBe("CONFIRMED");
  });
  it("books quotes with null amount and prohibits Mercado Pago", async () => {
    await expect(
      reserve(booking(quoteId, "10:00", "MERCADO_PAGO")),
    ).rejects.toThrow("cotización");
    await reserve(booking(quoteId, "10:00", "QUOTE"));
    const a = await db.appointment.findFirstOrThrow();
    expect(a.amountCents).toBeNull();
    expect(a.paymentStatus).toBe("NOT_REQUIRED");
    expect(a.serviceQuoteLabelSnapshot).toBe("Se cotiza por WhatsApp");
  });
  it("allows back-to-back appointments", async () => {
    await reserve(booking());
    await reserve(booking(serviceId, "11:00"));
    expect(await db.appointment.count()).toBe(2);
  });
  it("honors blocked hours, days, multi-day ranges and removal", async () => {
    const b = await db.blockedPeriod.create({
      data: {
        startAt: zoned(date, "09:00"),
        endAt: new Date(+zoned(date, "00:00") + 2 * 86400000),
      },
    });
    expect((await availability(db, serviceId, date)).map(localTime)).toEqual([
      "08:00",
    ]);
    await db.blockedPeriod.delete({ where: { id: b.id } });
    expect((await availability(db, serviceId, date)).length).toBe(12);
  });
  it("honors closed exceptions and custom hours", async () => {
    const e = await db.scheduleException.create({
      data: { date: new Date(`${date}T00:00:00Z`), type: "CLOSED" },
    });
    expect(await availability(db, serviceId, date)).toEqual([]);
    await db.scheduleException.update({
      where: { id: e.id },
      data: { type: "CUSTOM_HOURS", startTime: "12:00", endTime: "14:00" },
    });
    expect((await availability(db, serviceId, date)).map(localTime)).toEqual([
      "12:00",
      "13:00",
    ]);
  });
  it("honors closed weekdays", async () => {
    await db.weeklySchedule.deleteMany();
    expect(await availability(db, serviceId, date)).toEqual([]);
  });
  it("releases expired holds and accepts a new reservation", async () => {
    await reserve(booking());
    const a = await db.appointment.findFirstOrThrow();
    await db.appointment.update({
      where: { id: a.id },
      data: {
        status: "PENDING",
        paymentMethod: "MERCADO_PAGO",
        pendingExpiresAt: new Date(Date.now() - 1000),
      },
    });
    await expireHolds();
    await reserve(booking());
    expect(await db.appointment.count()).toBe(2);
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("EXPIRED");
  });
  it("processes duplicate webhooks and late approvals without taking a new slot", async () => {
    await reserve(booking());
    const old = await db.appointment.findFirstOrThrow();
    await db.appointment.update({
      where: { id: old.id },
      data: {
        status: "PENDING",
        paymentMethod: "MERCADO_PAGO",
        pendingExpiresAt: new Date(Date.now() - 1000),
      },
    });
    await expireHolds();
    await reserve(booking());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              id: 1234,
              external_reference: old.id,
              currency_id: "MXN",
              transaction_amount: 350,
              status: "approved",
              date_last_updated: "2026-11-01T12:00:00Z",
            }),
            { status: 200 },
          ),
      ),
    );
    await processPayment("1234");
    await processPayment("1234");
    const a = await db.appointment.findUniqueOrThrow({ where: { id: old.id } });
    expect(a.status).toBe("EXPIRED");
    expect(a.needsReview).toBe(true);
    expect(a.paymentStatus).toBe("PAID");
    expect(await db.paymentEvent.count()).toBe(1);
    expect(await db.paymentTransaction.count()).toBe(1);
    expect(await db.appointment.count({ where: { status: "CONFIRMED" } })).toBe(
      1,
    );
    vi.unstubAllGlobals();
  });
  it("does not downgrade an approved payment for an older pending event", async () => {
    await reserve(booking());
    const a = await db.appointment.findFirstOrThrow();
    await db.appointment.update({
      where: { id: a.id },
      data: {
        status: "PENDING",
        paymentMethod: "MERCADO_PAGO",
        pendingExpiresAt: new Date(Date.now() + 900000),
      },
    });
    const provider = {
      id: 1260,
      external_reference: a.id,
      currency_id: "MXN",
      transaction_amount: 350,
      status: "approved",
      date_last_updated: "2026-11-01T12:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () => new Response(JSON.stringify(provider))),
    );
    await processPayment("1260");
    provider.status = "pending";
    provider.date_last_updated = "2026-11-01T11:00:00Z";
    await processPayment("1260");
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: a.id } }))
        .paymentStatus,
    ).toBe("PAID");
    expect(
      (
        await db.paymentTransaction.findUniqueOrThrow({
          where: { paymentId: "1260" },
        })
      ).status,
    ).toBe("approved");
    expect(
      await db.paymentEvent.count({ where: { eventType: "STALE_EVENT" } }),
    ).toBe(1);
    vi.unstubAllGlobals();
  });
  it("preserves another approved payment, then cancels only after a verified full refund", async () => {
    await reserve(booking());
    const a = await db.appointment.findFirstOrThrow();
    await db.appointment.update({
      where: { id: a.id },
      data: {
        status: "PENDING",
        paymentMethod: "MERCADO_PAGO",
        pendingExpiresAt: new Date(Date.now() + 900000),
      },
    });
    const provider = {
      id: 1270,
      external_reference: a.id,
      currency_id: "MXN",
      transaction_amount: 350,
      status: "approved",
      date_last_updated: "2026-11-01T12:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () => new Response(JSON.stringify(provider))),
    );
    await processPayment("1270");
    provider.id = 1271;
    provider.status = "rejected";
    await processPayment("1271");
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: a.id } }))
        .paymentStatus,
    ).toBe("PAID");
    provider.id = 1270;
    provider.status = "refunded";
    provider.date_last_updated = "2026-11-01T13:00:00Z";
    await processPayment("1270");
    const updated = await db.appointment.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(updated.paymentStatus).toBe("REFUNDED");
    expect(updated.status).toBe("CANCELLED");
    vi.unstubAllGlobals();
  });
  it("never restores a cancelled appointment after payment", async () => {
    await reserve(booking());
    const a = await db.appointment.findFirstOrThrow();
    await db.appointment.update({
      where: { id: a.id },
      data: { status: "CANCELLED", paymentMethod: "MERCADO_PAGO" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              id: 1235,
              external_reference: a.id,
              currency_id: "MXN",
              transaction_amount: 350,
              status: "approved",
              date_last_updated: "2026-11-01T12:00:00Z",
            }),
          ),
      ),
    );
    await processPayment("1235");
    expect(
      (await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("CANCELLED");
    vi.unstubAllGlobals();
  });
});
