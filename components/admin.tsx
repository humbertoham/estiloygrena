import Link from "next/link";
import { statusLabel } from "@/lib/labels";
import type { Appointment } from "@/lib/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE, money } from "@/lib/constants";
export function AdminTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="admin-title">
      <div>
        <span className="micro">ESTILO Y GREÑA / ADMINISTRACIÓN</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function Flash({ params }: { params: { ok?: string; error?: string } }) {
  return (
    <>
      {params.ok && (
        <p className="admin-flash" role="status">
          {params.ok}
        </p>
      )}
      {params.error && (
        <p className="feedback error" role="alert">
          {params.error}
        </p>
      )}
    </>
  );
}
export function AppointmentTable({
  appointments,
}: {
  appointments: Appointment[];
}) {
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fecha y hora</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Cita</th>
            <th>Pago</th>
            <th>Código</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id}>
              <td>
                {formatInTimeZone(a.startAt, TIMEZONE, "dd/MM/yy")}
                <br />
                <strong>
                  {formatInTimeZone(a.startAt, TIMEZONE, "HH:mm")}
                </strong>{" "}
                – {formatInTimeZone(a.endAt, TIMEZONE, "HH:mm")}
              </td>
              <td>
                {a.customerName}
                <br />
                <a href={`tel:${a.phone}`}>{a.phone}</a>
              </td>
              <td>
                {a.serviceNameSnapshot}
                <br />
                <small>
                  {a.amountCents === null
                    ? a.serviceQuoteLabelSnapshot || "Por cotizar"
                    : money(a.amountCents)}
                </small>
              </td>
              <td>
                <span className="status">{statusLabel[a.status]}</span>
              </td>
              <td>
                {statusLabel[a.paymentMethod]}
                <br />
                {statusLabel[a.paymentStatus]}
                {a.needsReview && (
                  <strong className="review-flag">Requiere revisión</strong>
                )}
              </td>
              <td>
                <Link
                  className="text-link"
                  href={`/admin/citas?seleccion=${a.id}`}
                >
                  {a.bookingCode} ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!appointments.length && (
        <p className="admin-empty">No hay citas en esta selección.</p>
      )}
    </div>
  );
}
