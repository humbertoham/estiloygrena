import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTitle } from "@/components/admin";
import { localDate, zoned, localTime } from "@/lib/availability";
import { dateSchema } from "@/lib/validation";
import { availability, expireHolds } from "@/lib/scheduling";
import { statusLabel } from "@/lib/labels";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/constants";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; servicio?: string; vista?: string }>;
}) {
  const p = await searchParams;
  await expireHolds();
  const date = dateSchema.safeParse(p.fecha).success ? p.fecha! : localDate();
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  const service = services.find((s) => s.id === p.servicio) || services[0];
  const week = p.vista === "semana";
  const dates = Array.from({ length: week ? 7 : 1 }, (_, i) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const first = zoned(date, "00:00"),
    last = new Date(+first + dates.length * 86400000);
  const [appointments, blocks, weekly, exceptions, slots] = await Promise.all([
    db.appointment.findMany({
      where: { startAt: { lt: last }, endAt: { gt: first } },
      orderBy: { startAt: "asc" },
    }),
    db.blockedPeriod.findMany({
      where: { startAt: { lt: last }, endAt: { gt: first } },
    }),
    db.weeklySchedule.findMany(),
    db.scheduleException.findMany({
      where: {
        date: {
          gte: new Date(`${date}T00:00:00Z`),
          lte: new Date(`${dates.at(-1)}T00:00:00Z`),
        },
      },
    }),
    Promise.all(
      dates.map((d) =>
        service
          ? availability(db, service.id, d, undefined, undefined, true)
          : Promise.resolve([]),
      ),
    ),
  ]);
  const move = (days: number) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return `/admin/calendario?fecha=${d.toISOString().slice(0, 10)}&vista=${week ? "semana" : "dia"}&servicio=${service?.id || ""}`;
  };
  return (
    <>
      <AdminTitle
        title="Calendario"
        description="Disponibilidad, citas y bloqueos en hora local de Guadalupe."
      />
      <form className="admin-filters">
        <label className="field">
          Fecha inicial
          <input name="fecha" type="date" defaultValue={date} />
        </label>
        <label className="field">
          Servicio
          <select name="servicio" defaultValue={service?.id}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Vista
          <select name="vista" defaultValue={week ? "semana" : "dia"}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
          </select>
        </label>
        <button className="button">Consultar</button>
      </form>
      <div className="admin-inline calendar-controls">
        <Link className="button outline" href={move(week ? -7 : -1)}>
          ← Anterior
        </Link>
        <Link className="button outline" href={move(week ? 7 : 1)}>
          Siguiente →
        </Link>
        <Link className="text-link" href={`/admin/bloqueos?fecha=${date}`}>
          Cerrar día o periodo ↗
        </Link>
        <Link className="text-link" href="/admin/horarios">
          Ajustar horarios ↗
        </Link>
      </div>
      <div className={`admin-calendar ${week ? "week" : ""}`}>
        {dates.map((d, i) => {
          const weekday = new Date(`${d}T12:00:00Z`).getUTCDay(),
            ex = exceptions.filter(
              (e) => e.date.toISOString().slice(0, 10) === d,
            );
          const hours = ex.length
            ? ex.map((e) =>
                e.type === "CLOSED" ? "Cerrado" : `${e.startTime}–${e.endTime}`,
              )
            : weekly
                .filter((h) => h.weekday === weekday)
                .map((h) => `${h.startTime}–${h.endTime}`);
          return (
            <section className="calendar-day" key={d}>
              <h2>
                {new Intl.DateTimeFormat("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${d}T12:00:00Z`))}
              </h2>
              <p className="help">Horario: {hours.join(", ") || "Cerrado"}</p>
              {appointments
                .filter(
                  (a) =>
                    a.startAt < zoned(d, "23:59") &&
                    a.endAt > zoned(d, "00:00"),
                )
                .map((a) => (
                  <Link
                    className={`calendar-event event-${a.status.toLowerCase()}`}
                    key={a.id}
                    href={`/admin/citas?seleccion=${a.id}`}
                  >
                    <strong>
                      {localTime(a.startAt)}–{localTime(a.endAt)}
                    </strong>
                    <span>{a.customerName}</span>
                    <span>{a.serviceNameSnapshot}</span>
                    <small>
                      {statusLabel[a.status]} · {statusLabel[a.paymentStatus]}
                    </small>
                    {a.needsReview && <strong>Revisar pago</strong>}
                  </Link>
                ))}
              {blocks
                .filter(
                  (b) =>
                    b.startAt < zoned(d, "23:59") &&
                    b.endAt > zoned(d, "00:00"),
                )
                .map((b) => (
                  <Link
                    className="calendar-block"
                    key={b.id}
                    href="/admin/bloqueos"
                  >
                    Bloqueado · {b.reason || "Sin motivo"}
                    <br />
                    {formatInTimeZone(
                      b.startAt,
                      TIMEZONE,
                      "dd/MM HH:mm",
                    )} → {formatInTimeZone(b.endAt, TIMEZONE, "dd/MM HH:mm")}
                  </Link>
                ))}
              <h3>Horarios disponibles</h3>
              {!slots[i].length && (
                <p className="help">Sin horarios disponibles.</p>
              )}
              <div className="admin-slots">
                {slots[i].map((s) => (
                  <details key={s.toISOString()}>
                    <summary>
                      {localTime(s)} <span>＋</span>
                    </summary>
                    <div>
                      <Link
                        href={`/admin/citas/nueva?fecha=${d}&hora=${localTime(s)}&servicio=${service.id}`}
                      >
                        Crear cita ↗
                      </Link>
                      <Link
                        href={`/admin/bloqueos?fecha=${d}&hora=${localTime(s)}`}
                      >
                        Bloquear hora ↗
                      </Link>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
