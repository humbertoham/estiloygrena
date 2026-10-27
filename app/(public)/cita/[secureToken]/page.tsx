import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hash } from "@/lib/security";
import { getSettings } from "@/lib/data";
import { TIMEZONE, money, whatsappLink } from "@/lib/constants";
import { statusLabel } from "@/lib/labels";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { expireHolds } from "@/lib/scheduling";
export const metadata: Metadata = {
  title: "Tu cita",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export default async function Page({
  params,
}: {
  params: Promise<{ secureToken: string }>;
}) {
  const { secureToken } = await params;
  if (!/^[\w-]{43}$/.test(secureToken)) notFound();
  await expireHolds();
  const a = await db.appointment.findUnique({
    where: { publicTokenHash: hash(secureToken) },
  });
  if (!a) notFound();
  const settings = await getSettings();
  const date = formatInTimeZone(a.startAt, TIMEZONE, "dd/MM/yyyy"),
    time = formatInTimeZone(a.startAt, TIMEZONE, "HH:mm");
  const wa = whatsappLink(
    settings.whatsapp,
    `Hola, quiero ${a.paymentMethod === "QUOTE" ? "cotizar" : "consultar"} el servicio ${a.serviceNameSnapshot}. Mi cita es ${a.bookingCode}, el ${date} a las ${time}.`,
  );
  return (
    <section className="inner-poster confirmation">
      <span className="micro">TU RESERVA / ESTILO Y GREÑA</span>
      <h1 className="italic">
        {a.status === "CONFIRMED" ? "Nos vemos" : "Información"}
        <br />
        <span className="gothic">
          {a.status === "CONFIRMED" ? "en el salón." : "de tu cita."}
        </span>
      </h1>
      <span className="status">{statusLabel[a.status]}</span>
      <div className="confirmation-code">{a.bookingCode}</div>
      <div className="booking-summary">
        <h2 className="italic">{a.serviceNameSnapshot}</h2>
        <dl className="summary-list">
          <dt>Fecha</dt>
          <dd>{date}</dd>
          <dt>Hora de Guadalupe</dt>
          <dd>{time}</dd>
          <dt>Duración</dt>
          <dd>{a.serviceDurationSnapshot} min</dd>
          <dt>Forma de pago</dt>
          <dd>{statusLabel[a.paymentMethod]}</dd>
          <dt>Estado del pago</dt>
          <dd>{statusLabel[a.paymentStatus]}</dd>
        </dl>
        <div className="summary-total">
          <span>Importe</span>
          <strong>
            {a.servicePricingTypeSnapshot === "QUOTE"
              ? a.serviceQuoteLabelSnapshot || "Por cotizar"
              : `${money(a.amountCents!)} MXN`}
          </strong>
        </div>
      </div>
      {a.status === "PENDING" && (
        <p className="feedback">
          Tu horario se mantiene durante 15 minutos mientras completas el pago.
          La confirmación depende de la verificación del pago.
        </p>
      )}
      {a.needsReview && (
        <p className="feedback">
          Tu pago requiere revisión del salón. Un pago recibido después de la
          expiración no vuelve a reservar el horario. Contacta al salón con tu
          código.
        </p>
      )}
      <p>
        Guarda este enlace; permite consultar tu reserva. No lo compartas
        públicamente.
      </p>
      <div className="button-row">
        {wa && (
          <a href={wa} className="button">
            {a.paymentMethod === "QUOTE"
              ? "Cotizar por WhatsApp"
              : "Consultar mi cita"}{" "}
            ↗
          </a>
        )}
        <Link href="/ubicacion" className="text-link">
          Cómo llegar ↗
        </Link>
      </div>
    </section>
  );
}
