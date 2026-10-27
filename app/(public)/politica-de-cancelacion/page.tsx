import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
export const metadata: Metadata = {
  title: "Cancelaciones y pagos",
  alternates: { canonical: "/politica-de-cancelacion" },
};
export default async function Page() {
  const s = await getSettings();
  return (
    <article className="inner-poster legal-poster">
      <span className="micro">INFORMACIÓN / ESTILO Y GREÑA</span>
      <h1 className="italic">
        Cancelaciones
        <br />y pagos
      </h1>
      <p className="notice">
        Política provisional pendiente de revisión del salón antes de su
        publicación.
      </p>
      <h2>Cambios y cancelaciones</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{s.cancellationPolicy}</p>
      <h2>Reservas y pagos en línea</h2>
      <p>
        El horario se reserva durante 15 minutos al iniciar un pago. Si no se
        confirma el pago dentro de ese periodo, el horario puede liberarse. Un
        pago posterior no recupera automáticamente una cita expirada o
        cancelada.
      </p>
      <h2>Cotizaciones</h2>
      <p>
        Los servicios por cotización no se cobran en línea. El importe se
        acuerda con el salón después de valorar el servicio.
      </p>
      <h2>Revisión y reembolsos</h2>
      <p>
        Si un pago requiere revisión, comunícate con el salón e indica tu código
        de reserva. Una cancelación de cita no genera por sí sola un reembolso.
        El salón revisa cada pago en Mercado Pago y confirma la resolución. El
        estado «Reembolsado» se muestra únicamente después de verificarlo con el
        procesador.
      </p>
    </article>
  );
}
