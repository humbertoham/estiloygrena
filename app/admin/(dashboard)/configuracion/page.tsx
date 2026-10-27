import { AdminTitle, Flash } from "@/components/admin";
import { getSettings } from "@/lib/data";
import { saveSettings } from "../../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const s = await getSettings();
  return (
    <>
      <AdminTitle
        title="Configuración"
        description="Información pública y reglas de reservación."
      />
      <Flash params={await searchParams} />
      <form action={saveSettings} className="admin-panel">
        <h2>Información del salón</h2>
        {[
          ["businessName", "Nombre del negocio"],
          ["description", "Descripción"],
          ["address", "Dirección"],
          ["whatsapp", "WhatsApp (código de país y número, sin espacios)"],
          ["instagram", "URL de Instagram"],
          ["mapsUrl", "URL de Google Maps"],
          ["privacyContact", "Contacto para solicitudes de privacidad"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              name={key}
              defaultValue={s[key]}
              type={["instagram", "mapsUrl"].includes(key) ? "url" : "text"}
            />
          </label>
        ))}
        <h2>Reglas de agenda</h2>
        <div className="form-grid">
          <label className="field">
            Intervalo entre inicios
            <select name="bookingInterval" defaultValue={s.bookingInterval}>
              {[15, 30, 60, 90].map((n) => (
                <option value={n} key={n}>
                  {n} minutos
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Anticipación mínima (minutos)
            <input
              name="advanceNoticeMinutes"
              type="number"
              min="0"
              max="10080"
              defaultValue={s.advanceNoticeMinutes}
            />
          </label>
          <label className="field">
            Ventana de reservación (días)
            <input
              name="maxAdvanceDays"
              type="number"
              min="1"
              max="365"
              defaultValue={s.maxAdvanceDays}
            />
          </label>
          <label className="field">
            Tiempo adicional entre citas (minutos)
            <input
              name="bufferMinutes"
              type="number"
              min="0"
              max="120"
              defaultValue={s.bufferMinutes}
            />
          </label>
        </div>
        <label className="check">
          <input
            name="bookingEnabled"
            type="checkbox"
            defaultChecked={s.bookingEnabled === "true"}
          />
          Abrir agenda pública. He confirmado los servicios y horarios.
        </label>
        <label className="check">
          <input
            name="developmentData"
            type="checkbox"
            defaultChecked={s.developmentData === "true"}
          />
          Mostrar aviso de catálogo de desarrollo.
        </label>
        <h2>Política de cancelación</h2>
        <label className="field">
          Texto público
          <textarea
            name="cancellationPolicy"
            defaultValue={s.cancellationPolicy}
            rows={6}
            maxLength={5000}
          />
        </label>
        <p className="help">
          Los avisos legales requieren revisión antes del lanzamiento. Las
          credenciales de acceso, R2 y pagos se administran mediante variables
          de entorno.
        </p>
        <button className="button">Guardar configuración</button>
      </form>
    </>
  );
}
