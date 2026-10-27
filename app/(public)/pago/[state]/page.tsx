import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Estado del pago",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ cita?: string }>;
}) {
  const { state } = await params,
    { cita } = await searchParams;
  const copy: Record<string, [string, string]> = {
    exito: [
      "Estamos verificando tu pago.",
      "La pantalla de Mercado Pago no confirma tu cita por sí sola. Consulta el estado actualizado en los detalles de tu reserva.",
    ],
    pendiente: [
      "Tu pago está pendiente.",
      "La reserva del horario vence a los 15 minutos. Un pago posterior requiere revisión con el salón.",
    ],
    error: [
      "No se completó el pago.",
      "Puedes consultar tu reserva o volver a revisar los horarios disponibles.",
    ],
  };
  if (!copy[state]) notFound();
  return (
    <section className="inner-poster state-page">
      <div className="micro">MERCADO PAGO / ESTILO Y GREÑA</div>
      <h1 className="italic">{copy[state][0]}</h1>
      <p>{copy[state][1]}</p>
      {cita && /^[\w-]{43}$/.test(cita) ? (
        <Link className="button" href={`/cita/${cita}`}>
          Consultar mi cita ↗
        </Link>
      ) : (
        <Link href="/agendar" className="button">
          Consultar horarios ↗
        </Link>
      )}
    </section>
  );
}
