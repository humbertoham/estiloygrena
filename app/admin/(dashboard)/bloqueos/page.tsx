import { db } from "@/lib/db";
import { AdminTitle, Flash } from "@/components/admin";
import { saveBlock, removeBlock } from "../../actions";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/constants";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    fecha?: string;
    hora?: string;
  }>;
}) {
  const p = await searchParams,
    blocks = await db.blockedPeriod.findMany({
      orderBy: { startAt: "desc" },
      take: 150,
    });
  return (
    <>
      <AdminTitle
        title="Bloqueos"
        description="Bloquea horas, días completos o vacaciones. Las citas existentes nunca se cancelan automáticamente."
      />
      <Flash params={p} />
      <section className="admin-panel">
        <h2>Bloquear un periodo</h2>
        <p className="help">
          Para cerrar un día: desde 00:00 hasta 00:00 del día siguiente. Para
          vacaciones: indica la fecha de regreso como fin.
        </p>
        <form action={saveBlock}>
          <div className="form-grid">
            <label className="field">
              Fecha inicial
              <input
                name="startDate"
                type="date"
                defaultValue={p.fecha}
                required
              />
            </label>
            <label className="field">
              Hora inicial
              <input
                name="startTime"
                type="time"
                defaultValue={p.hora || "00:00"}
                required
              />
            </label>
            <label className="field">
              Fecha final
              <input
                name="endDate"
                type="date"
                defaultValue={p.fecha}
                required
              />
            </label>
            <label className="field">
              Hora final
              <input
                name="endTime"
                type="time"
                defaultValue={
                  p.hora
                    ? `${String(Math.min(23, Number(p.hora.slice(0, 2)) + 1)).padStart(2, "0")}:00`
                    : "00:00"
                }
                required
              />
            </label>
          </div>
          <label className="field">
            Motivo
            <input name="reason" maxLength={200} />
          </label>
          <label className="check">
            <input type="checkbox" name="allowConflicts" />
            Si hay citas, conservarlas y guardar el bloqueo para revisión.
          </label>
          <button className="button">Guardar bloqueo</button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>Periodos bloqueados</h2>
        {blocks.map((b) => (
          <details className="admin-panel" key={b.id}>
            <summary>
              {formatInTimeZone(b.startAt, TIMEZONE, "dd/MM/yy HH:mm")} →{" "}
              {formatInTimeZone(b.endAt, TIMEZONE, "dd/MM/yy HH:mm")}
              <span>{b.reason}</span>
            </summary>
            <form action={saveBlock} className="admin-form">
              <input type="hidden" name="id" value={b.id} />
              <div className="form-grid">
                {[
                  [
                    "startDate",
                    "Fecha inicial",
                    "date",
                    formatInTimeZone(b.startAt, TIMEZONE, "yyyy-MM-dd"),
                  ],
                  [
                    "startTime",
                    "Hora inicial",
                    "time",
                    formatInTimeZone(b.startAt, TIMEZONE, "HH:mm"),
                  ],
                  [
                    "endDate",
                    "Fecha final",
                    "date",
                    formatInTimeZone(b.endAt, TIMEZONE, "yyyy-MM-dd"),
                  ],
                  [
                    "endTime",
                    "Hora final",
                    "time",
                    formatInTimeZone(b.endAt, TIMEZONE, "HH:mm"),
                  ],
                ].map(([name, label, type, value]) => (
                  <label className="field" key={name}>
                    {label}
                    <input
                      name={name}
                      type={type}
                      defaultValue={value}
                      required
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Motivo
                <input name="reason" defaultValue={b.reason || ""} />
              </label>
              <label className="check">
                <input name="allowConflicts" type="checkbox" />
                Conservar las citas existentes si hay conflicto.
              </label>
              <button className="button">Actualizar bloqueo</button>
            </form>
            <form action={removeBlock} className="admin-form">
              <input name="id" type="hidden" value={b.id} />
              <button className="button outline">Quitar bloqueo</button>
            </form>
          </details>
        ))}
        {!blocks.length && <p className="help">No hay periodos bloqueados.</p>}
      </section>
    </>
  );
}
