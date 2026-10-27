import { db } from "@/lib/db";
import { AdminTitle, Flash } from "@/components/admin";
import { saveHours, saveException, removeException } from "../../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [hours, exceptions] = await Promise.all([
    db.weeklySchedule.findMany({
      orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }],
    }),
    db.scheduleException.findMany({ orderBy: { date: "asc" } }),
  ]);
  return (
    <>
      <AdminTitle
        title="Horarios"
        description="Hora local de Guadalupe (America/Monterrey). Un día vacío se considera cerrado."
      />
      <Flash params={await searchParams} />
      <section className="admin-panel">
        <h2>Horario semanal</h2>
        <p className="help">
          Escribe uno o varios intervalos por día: 10:00-14:00, 15:00-19:00.
          Estos son ejemplos; confirma el horario real.
        </p>
        <form action={saveHours}>
          {[
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ].map((day, i) => (
            <label className="field hours-field" key={day}>
              {day}
              <input
                name={`day-${i}`}
                defaultValue={hours
                  .filter((h) => h.weekday === i)
                  .map((h) => `${h.startTime}-${h.endTime}`)
                  .join(", ")}
                placeholder="Cerrado"
              />
            </label>
          ))}
          <button className="button">Guardar horario semanal</button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>Excepción de fecha</h2>
        <p className="help">
          Una fecha con horario especial reemplaza el horario semanal. Puedes
          agregar varios intervalos a la misma fecha. Un cierre tiene prioridad.
        </p>
        <form action={saveException}>
          <div className="form-grid">
            <label className="field">
              Fecha
              <input type="date" name="date" required />
            </label>
            <label className="field">
              Tipo
              <select name="type">
                <option value="CLOSED">Día cerrado</option>
                <option value="CUSTOM_HOURS">Horario especial</option>
              </select>
            </label>
            <label className="field">
              Desde (horario especial)
              <input type="time" name="startTime" />
            </label>
            <label className="field">
              Hasta (horario especial)
              <input type="time" name="endTime" />
            </label>
          </div>
          <label className="field">
            Motivo
            <input name="label" maxLength={200} />
          </label>
          <button className="button">Agregar excepción</button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>Excepciones guardadas</h2>
        {exceptions.map((e) => (
          <div className="admin-list-row" key={e.id}>
            <div>
              <strong>{e.date.toISOString().slice(0, 10)}</strong> ·{" "}
              {e.type === "CLOSED" ? "Cerrado" : `${e.startTime}–${e.endTime}`}
              <br />
              <small>{e.label}</small>
            </div>
            <form action={removeException}>
              <input type="hidden" name="id" value={e.id} />
              <button className="button outline">Quitar</button>
            </form>
          </div>
        ))}
        {!exceptions.length && <p className="help">Sin excepciones.</p>}
      </section>
    </>
  );
}
