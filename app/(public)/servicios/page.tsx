import type { Metadata } from "next";
import { getServices, getSettings } from "@/lib/data";
import { ServiceIndex } from "@/components/service-index";
export const metadata: Metadata = {
  title: "Servicios",
  alternates: { canonical: "/servicios" },
};
export default async function Page() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings(),
  ]);
  return (
    <section className="inner-poster services-page">
      <div className="micro">CATÁLOGO / ESTILO Y GREÑA</div>
      <h1 className="display-heading gothic">
        Servicios<span className="italic">y precios.</span>
      </h1>
      <p>Selecciona un servicio para consultar los horarios disponibles.</p>
      {settings.developmentData === "true" && (
        <p className="notice">
          Datos de desarrollo. Los precios y duraciones de este catálogo deben
          confirmarse con el salón antes de publicar.
        </p>
      )}
      <ServiceIndex services={services} />
      <p className="micro">
        PRECIOS EN MXN · LOS SERVICIOS DE COLOR REQUIEREN COTIZACIÓN
      </p>
    </section>
  );
}
