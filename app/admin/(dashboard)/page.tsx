import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { AdminTitle, AppointmentTable } from "@/components/admin";
import { localDate, zoned } from "@/lib/availability";
import { expireHolds } from "@/lib/scheduling";
export default async function Page() {
  await expireHolds();
  const today = zoned(localDate(), "00:00"),
    tomorrow = new Date(+today + 86400000);
  const [
    appointments,
    upcoming,
    pending,
    paid,
    cancelled,
    quotes,
    review,
    settings,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { startAt: { gte: today, lt: tomorrow } },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.count({
      where: {
        startAt: { gte: tomorrow },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.appointment.count({
      where: {
        paymentStatus: "PENDING",
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.appointment.count({ where: { paymentStatus: "PAID" } }),
    db.appointment.count({ where: { status: "CANCELLED" } }),
    db.appointment.count({
      where: {
        paymentMethod: "QUOTE",
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.appointment.count({ where: { needsReview: true } }),
    getSettings(),
  ]);
  return (
    <>
      <AdminTitle
        title="Panel de administrador"
        description="Resumen de citas y pagos del salón."
      >
        <Link href="/admin/citas/nueva" className="button">
          Crear cita ＋
        </Link>
      </AdminTitle>
      {settings.bookingEnabled !== "true" && (
        <p className="admin-flash">
          La agenda pública está cerrada. Confirma servicios y horarios, y
          actívala en{" "}
          <Link href="/admin/configuracion" className="text-link">
            Configuración
          </Link>
          .
        </p>
      )}
      {review > 0 && (
        <p className="feedback error">
          Hay {review} pago(s) que requieren revisión.{" "}
          <Link href="/admin/citas?revision=1" className="text-link">
            Revisar citas ↗
          </Link>
        </p>
      )}
      <div className="stats-grid">
        {[
          ["Hoy", appointments.length],
          ["Próximas citas", upcoming],
          ["Pagos pendientes", pending],
          ["Pagadas", paid],
          ["Canceladas", cancelled],
          ["Por cotizar", quotes],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Citas de hoy</h2>
        <AppointmentTable appointments={appointments} />
      </section>
    </>
  );
}
