import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
export const metadata: Metadata = {
  title: "Aviso de privacidad",
  alternates: { canonical: "/privacidad" },
};
export default async function Page() {
  const s = await getSettings();
  return (
    <article className="inner-poster legal-poster">
      <span className="micro">INFORMACIÓN / ESTILO Y GREÑA</span>
      <h1 className="italic">Aviso de privacidad</h1>
      <p className="notice">
        Texto provisional. Requiere revisión y confirmación del responsable
        antes del lanzamiento público.
      </p>
      <h2>Datos para gestionar tu cita</h2>
      <p>
        Estilo y Greña solicita tu nombre y teléfono para registrar y
        administrar tu cita. Puedes proporcionar correo electrónico, Instagram y
        notas de forma opcional. No incluyas datos sensibles en las notas.
      </p>
      <h2>Uso y resguardo</h2>
      <p>
        Usamos esta información para coordinar tu visita, consultar el estado de
        tu reserva y atender cambios. El panel de administración requiere acceso
        autorizado. Guarda de forma privada el enlace de confirmación de tu
        cita.
      </p>
      <h2>Pagos y proveedores</h2>
      <p>
        El pago en línea se procesa en Mercado Pago. Esta web no recibe ni
        almacena datos de tu tarjeta. Los datos de reserva se almacenan en la
        base de datos del salón; las imágenes se sirven desde Cloudflare R2.
      </p>
      <h2>Contacto y solicitudes</h2>
      <p>
        Para solicitar acceso, corrección o eliminación de tus datos, contacta
        al salón en {s.privacyContact || s.address}. El responsable debe definir
        y confirmar los plazos de conservación y los procedimientos de atención
        antes de publicar este aviso.
      </p>
      <h2>Cookies</h2>
      <p>
        El panel usa una cookie necesaria para mantener la sesión del
        administrador. El mapa integrado de Google puede usar sus propias
        cookies al cargarse. No incorporamos herramientas de publicidad o
        analítica.
      </p>
    </article>
  );
}
