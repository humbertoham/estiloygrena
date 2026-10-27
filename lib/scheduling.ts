import { db } from "./db";
import { Prisma } from "./generated/prisma/client";
import { DEFAULT_SETTINGS } from "./constants";
import { zoned, slotsForDay } from "./availability";
export type Tx = Prisma.TransactionClient;
export async function calendarLock(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(48273105)`;
}
export async function expireHolds(tx: Tx = db, now = new Date()) {
  return tx.appointment.updateMany({
    where: {
      status: "PENDING",
      paymentMethod: "MERCADO_PAGO",
      pendingExpiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
}
export async function availability(
  tx: Tx,
  serviceId: string,
  date: string,
  ignoreId?: string,
  durationOverride?: number,
  admin = false,
) {
  const service = await tx.service.findFirst({
    where: { id: serviceId, ...(admin ? {} : { isActive: true }) },
  });
  if (!service) throw new Error("El servicio ya no está disponible.");
  const settings = {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(
      (await tx.siteSetting.findMany()).map((s) => [s.key, s.value]),
    ),
  };
  if (settings.bookingEnabled !== "true" && !admin) return [];
  const startAt = zoned(date, "00:00");
  const endAt = new Date(startAt.getTime() + 86400000);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [weekly, exceptions, blocks, bookings] = await Promise.all([
    tx.weeklySchedule.findMany({
      where: { weekday },
      orderBy: { sortOrder: "asc" },
    }),
    tx.scheduleException.findMany({
      where: { date: new Date(`${date}T00:00:00Z`) },
    }),
    tx.blockedPeriod.findMany({
      where: { startAt: { lt: endAt }, endAt: { gt: startAt } },
    }),
    tx.appointment.findMany({
      where: {
        id: ignoreId ? { not: ignoreId } : undefined,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        OR: [
          { pendingExpiresAt: null },
          { pendingExpiresAt: { gt: new Date() } },
          { status: "CONFIRMED" },
        ],
      },
    }),
  ]);
  const hours = exceptions.some((e) => e.type === "CLOSED")
    ? []
    : exceptions.length
      ? exceptions
          .filter((e) => e.startTime && e.endTime)
          .map((e) => ({ startTime: e.startTime!, endTime: e.endTime! }))
      : weekly;
  const buffer = Number(settings.bufferMinutes);
  return slotsForDay({
    date,
    hours,
    unavailable: [
      ...blocks,
      ...bookings.map((b) => ({
        startAt: b.startAt,
        endAt: new Date(+b.endAt + buffer * 60000),
      })),
    ],
    duration: durationOverride ?? service.durationMinutes,
    interval: Number(settings.bookingInterval),
    notice: admin ? 0 : Number(settings.advanceNoticeMinutes),
    maxDays: admin ? 36500 : Number(settings.maxAdvanceDays),
    buffer,
  });
}
