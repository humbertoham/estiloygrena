import { getServices, getSettings } from "@/lib/data";
import { localDate } from "@/lib/availability";
import { paymentsEnabled } from "@/lib/payments";
import { BookingForm } from "./booking-form";
export async function BookingPage({
  service,
  calendar = false,
}: {
  service?: string;
  calendar?: boolean;
}) {
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings(),
  ]);
  return (
    <section className="inner-poster booking-page">
      <div className="booking-heading">
        <h1 className="italic">
          {calendar ? "Calendario" : "Agenda"}
          <br />
          <span className="gothic">{calendar ? "del salón." : "tu cita."}</span>
        </h1>
        <span className="micro">
          ESTILO Y GREÑA /<br />
          GUADALUPE, N.L.
          <br />
          RESERVAS SIN CUENTA
        </span>
      </div>
      {settings.developmentData === "true" && (
        <p className="notice">
          Catálogo de desarrollo. Precios y duraciones sujetos a confirmación
          del salón.
        </p>
      )}
      <BookingForm
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          pricingType: s.pricingType,
          priceCents: s.priceCents,
          quoteLabel: s.quoteLabel,
          durationMinutes: s.durationMinutes,
        }))}
        today={localDate()}
        initialService={service}
        payments={paymentsEnabled()}
        enabled={settings.bookingEnabled === "true"}
      />
    </section>
  );
}
