import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTitle, Flash, AppointmentTable } from "@/components/admin";
import { updateAppointment, rescheduleAppointment } from "../../actions";
import { zoned } from "@/lib/availability";
import { dateSchema } from "@/lib/validation";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/constants";
import { expireHolds } from "@/lib/scheduling";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    fecha?: string;
    estado?: string;
    seleccion?: string;
    revision?: string;
  }>;
}) {
  const p = await searchParams;
  await expireHolds();
  const validDate = dateSchema.safeParse(p.fecha);
  const start = validDate.success ? zoned(validDate.data, "00:00") : undefined;
  const statuses = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "EXPIRED",
  ] as const;
  const status = statuses.find((s) => s === p.estado);
  const appointments = await db.appointment.findMany({
    where: {
      ...(start
        ? { startAt: { gte: start, lt: new Date(+start + 86400000) } }
        : {}),
      ...(status ? { status } : {}),
      ...(p.revision ? { needsReview: true } : {}),
    },
    orderBy: { startAt: "desc" },
    take: 150,
  });
  const a = p.seleccion
    ? await db.appointment.findUnique({ where: { id: p.seleccion } })
    : null;
  return (
    <>
      <AdminTitle
        title="Citas"
        description="Consulta y administra las reservas. Los estados de cita y pago se muestran por separado."
      >
        <Link href="/admin/citas/nueva" className="button">
          Crear cita ＋
        </Link>
      </AdminTitle>
      <Flash params={p} />
      <form className="admin-filters">
        <label className="field">
          Fecha
          <input type="date" name="fecha" defaultValue={p.fecha} />
        </label>
        <label className="field">
          Estado
          <select name="estado" defaultValue={p.estado || ""}>
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="EXPIRED">Expirada</option>
            <option value="NO_SHOW">No asistió</option>
          </select>
        </label>
        <button className="button">Filtrar</button>
        <Link className="text-link" href="/admin/citas">
          Limpiar filtros
        </Link>
      </form>
      {a && (
        <section className="admin-panel selected-appointment">
          <h2>
            {a.bookingCode} · {a.customerName}
          </h2>
          <p>
            {a.serviceNameSnapshot} ·{" "}
            {formatInTimeZone(a.startAt, TIMEZONE, "dd/MM/yyyy HH:mm")}
            <br />
            {a.phone}
            {a.email && ` · ${a.email}`}
            {a.instagram && ` · ${a.instagram}`}
          </p>
          {a.notes && (
            <p className="feedback" style={{ whiteSpace: "pre-wrap" }}>
              {a.notes}
            </p>
          )}
          <form action={updateAppointment} className="admin-inline">
            <input type="hidden" name="id" value={a.id} />
            {["CONFIRMED", "PENDING"].includes(a.status) && (
              <>
                <button name="action" value="COMPLETED" className="button">
                  Marcar completada
                </button>
                <button
                  name="action"
                  value="NO_SHOW"
                  className="button outline"
                >
                  No asistió
                </button>
                <label className="check">
                  <input required type="checkbox" />
                  Confirmo este cambio
                </label>
                <button
                  name="action"
                  value="CANCELLED"
                  className="button outline"
                >
                  Cancelar cita
                </button>
              </>
            )}
            {a.paymentMethod === "CASH" &&
              a.paymentStatus !== "PAID" &&
              ["CONFIRMED", "COMPLETED"].includes(a.status) && (
                <button name="action" value="CASH_PAID" className="button">
                  Marcar cobro en local
                </button>
              )}
          </form>
          {a.status === "CONFIRMED" && (
            <details className="admin-panel">
              <summary>Reprogramar cita</summary>
              <form action={rescheduleAppointment} className="admin-form">
                <input type="hidden" name="id" value={a.id} />
                <div className="form-grid">
                  <label className="field">
                    Nueva fecha
                    <input type="date" name="date" required />
                  </label>
                  <label className="field">
                    Nueva hora
                    <input type="time" name="time" required />
                  </label>
                </div>
                <p className="help">
                  Se valida que toda la duración original quepa en el horario.
                  Consulta primero el calendario.
                </p>
                <button className="button">Guardar nueva fecha</button>
              </form>
            </details>
          )}
          {a.needsReview && (
            <div className="reconciliation">
              <h3>Revisión de pago</h3>
              <p>
                Consulta el pago {a.paymentId || "en Mercado Pago"}. Si requiere
                reembolso, realízalo en Mercado Pago y espera la verificación
                del webhook. No se recupera automáticamente el horario ni se
                simula un reembolso.
              </p>
              <a
                className="text-link"
                href="https://www.mercadopago.com.mx/activities"
                target="_blank"
                rel="noreferrer"
              >
                Abrir actividad de Mercado Pago ↗
              </a>
              <form action={updateAppointment} className="admin-form">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="action" value="REVIEWED" />
                <label className="field">
                  Resolución documentada
                  <textarea
                    name="resolution"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </label>
                <button className="button">
                  Registrar resolución y cerrar revisión
                </button>
              </form>
            </div>
          )}
        </section>
      )}
      <section className="admin-panel">
        <AppointmentTable appointments={appointments} />
        <p className="help">
          Se muestran hasta 150 citas. Usa el filtro de fecha para acotar la
          consulta.
        </p>
      </section>
    </>
  );
}
