"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE, money } from "@/lib/constants";
type Service = {
  id: string;
  name: string;
  pricingType: "FIXED" | "QUOTE";
  priceCents: number | null;
  quoteLabel: string | null;
  durationMinutes: number;
};
type Customer = {
  customerName: string;
  phone: string;
  email: string;
  instagram: string;
  notes: string;
  consent: boolean;
};
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function BookingForm({
  services,
  today,
  initialService,
  payments,
  enabled,
  admin = false,
  initialDate,
  initialTime,
}: {
  services: Service[];
  today: string;
  initialService?: string;
  payments: boolean;
  enabled: boolean;
  admin?: boolean;
  initialDate?: string;
  initialTime?: string;
}) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [serviceId, setServiceId] = useState(
    services.some((s) => s.id === initialService)
      ? initialService!
      : services[0]?.id || "",
  );
  const [date, setDate] = useState(initialDate || today),
    [slots, setSlots] = useState<string[]>([]),
    [selected, setSelected] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [payment, setPayment] = useState("CASH");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Customer>();
  const service = services.find((s) => s.id === serviceId),
    quote = service?.pricingType === "QUOTE";
  useEffect(() => {
    const controller = new AbortController();
    if (!serviceId || !date) return;
    fetch(
      `/api/${admin ? "admin/" : ""}availability?service=${encodeURIComponent(serviceId)}&date=${date}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setSlots(data.slots);
        if (initialTime && date === initialDate) {
          const match = data.slots.find(
            (s: string) =>
              formatInTimeZone(new Date(s), TIMEZONE, "HH:mm") === initialTime,
          );
          if (match) setSelected(match);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("No pudimos consultar los horarios. Intenta de nuevo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [serviceId, date, admin, initialDate, initialTime]);
  function resetAvailability() {
    setSelected("");
    setSlots([]);
    setLoading(true);
    setError("");
  }
  function selectDate(value: string) {
    resetAvailability();
    setDate(value);
  }
  function changeDate(days: number) {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    const value = next.toISOString().slice(0, 10);
    if (value >= today) selectDate(value);
  }
  async function submit(customer: Customer) {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(`/api/${admin ? "admin/" : ""}bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          serviceId,
          date,
          startAt: selected,
          paymentMethod: quote ? "QUOTE" : payment,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      window.location.assign(
        data.checkoutUrl ||
          (admin ? "/admin/citas?ok=Cita%20creada" : `/cita/${data.token}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la cita");
      setSubmitting(false);
    }
  }
  return (
    <div className="booking-layout">
      <form onSubmit={handleSubmit(submit)} data-ready={ready}>
        <fieldset disabled={!ready || submitting} className="booking-fields">
          {!enabled && (
            <p className="feedback">
              La agenda aún no está abierta. El salón debe confirmar sus
              horarios antes de recibir reservas.{" "}
              <Link href="/ubicacion" className="text-link">
                Ver ubicación y contacto ↗
              </Link>
            </p>
          )}
          <section className="booking-section">
            <h2 className="step-title">
              <span>01</span> Selecciona un servicio
            </h2>
            <label className="field">
              Servicio
              <select
                value={serviceId}
                onChange={(e) => {
                  resetAvailability();
                  setServiceId(e.target.value);
                  setPayment("CASH");
                }}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min ·{" "}
                    {s.pricingType === "QUOTE"
                      ? s.quoteLabel || "Se cotiza por WhatsApp"
                      : money(s.priceCents!)}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="booking-section">
            <h2 className="step-title">
              <span>02</span> Elige una fecha y horario
            </h2>
            <div className="date-row">
              <button
                type="button"
                className="date-nav"
                aria-label="Día anterior"
                onClick={() => changeDate(-1)}
                disabled={date <= today}
              >
                ←
              </button>
              <label className="field">
                Fecha
                <input
                  type="date"
                  min={today}
                  value={date}
                  required
                  onChange={(e) => selectDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="date-nav"
                aria-label="Día siguiente"
                onClick={() => changeDate(1)}
              >
                →
              </button>
            </div>
            <p className="micro">HORA LOCAL DE GUADALUPE, NUEVO LEÓN</p>
            <div aria-live="polite" aria-busy={loading}>
              {loading ? (
                <p className="feedback">Consultando horarios…</p>
              ) : slots.length ? (
                <div
                  className="slots"
                  role="group"
                  aria-label="Horarios disponibles"
                >
                  {slots.map((slot) => (
                    <button
                      type="button"
                      className="slot"
                      key={slot}
                      aria-pressed={selected === slot}
                      onClick={() => setSelected(slot)}
                    >
                      {formatInTimeZone(new Date(slot), TIMEZONE, "HH:mm")}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="feedback">
                  No hay horarios disponibles para este servicio en la fecha
                  seleccionada. Puedes elegir otro día.
                </p>
              )}
            </div>
          </section>
          <section className="booking-section">
            <h2 className="step-title">
              <span>03</span> Tus datos
            </h2>
            <div className="form-grid">
              <label className="field">
                Nombre
                <input
                  autoComplete="name"
                  {...register("customerName", {
                    required: "Escribe tu nombre",
                    minLength: {
                      value: 2,
                      message: "Escribe tu nombre completo",
                    },
                    maxLength: 100,
                  })}
                />
                {errors.customerName && (
                  <span className="field-error">
                    {errors.customerName.message}
                  </span>
                )}
              </label>
              <label className="field">
                Teléfono
                <input
                  autoComplete="tel"
                  type="tel"
                  {...register("phone", {
                    required: "Escribe tu teléfono",
                    pattern: {
                      value: /^\+?[\d\s()-]{10,22}$/,
                      message: "Revisa tu teléfono",
                    },
                  })}
                />
                {errors.phone && (
                  <span className="field-error">{errors.phone.message}</span>
                )}
              </label>
              <label className="field">
                Correo electrónico (opcional)
                <input
                  autoComplete="email"
                  type="email"
                  {...register("email")}
                />
              </label>
              <label className="field">
                Instagram (opcional)
                <input {...register("instagram", { maxLength: 100 })} />
              </label>
            </div>
            <label className="field">
              Notas para tu visita (opcional)
              <textarea {...register("notes", { maxLength: 1000 })} rows={3} />
            </label>
          </section>
          <section className="booking-section">
            <h2 className="step-title">
              <span>04</span> Forma de pago
            </h2>
            {quote ? (
              <p className="feedback">
                {service?.quoteLabel || "Se cotiza por WhatsApp"}. Reservar no
                realiza un cobro. El importe se acuerda con el salón.
              </p>
            ) : (
              <div className="payment-options">
                <label className="payment-choice">
                  <input
                    type="radio"
                    name="payment"
                    value="CASH"
                    checked={payment === "CASH"}
                    onChange={() => setPayment("CASH")}
                  />
                  <span>
                    Pagar en el local
                    <small>Tu cita se confirma al reservar.</small>
                  </span>
                </label>
                {payments ? (
                  <label className="payment-choice">
                    <input
                      type="radio"
                      name="payment"
                      value="MERCADO_PAGO"
                      checked={payment === "MERCADO_PAGO"}
                      onChange={() => setPayment("MERCADO_PAGO")}
                    />
                    <span>
                      Mercado Pago
                      <small>Tienes 15 minutos para completar tu pago.</small>
                    </span>
                  </label>
                ) : (
                  <p className="micro">
                    PAGO EN LÍNEA NO DISPONIBLE POR EL MOMENTO
                  </p>
                )}
              </div>
            )}
          </section>
          <label className="consent">
            <input
              type="checkbox"
              {...register("consent", { required: true })}
            />
            <span>
              Leí el{" "}
              <Link href="/privacidad" target="_blank">
                aviso de privacidad
              </Link>{" "}
              y la{" "}
              <Link href="/politica-de-cancelacion" target="_blank">
                política de cancelación
              </Link>{" "}
              y acepto el uso de mis datos para gestionar esta cita.
            </span>
          </label>
          {errors.consent && (
            <p className="field-error">
              Acepta el aviso de privacidad para continuar.
            </p>
          )}
          {error && (
            <p className="feedback error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="button submit-booking"
            disabled={!selected || submitting || !enabled}
          >
            {submitting
              ? "Confirmando…"
              : payment === "MERCADO_PAGO" && !quote
                ? "Continuar a Mercado Pago ↗"
                : "Confirmar cita ↗"}
          </button>
        </fieldset>
      </form>
      <aside className="booking-summary" aria-label="Resumen de tu cita">
        <span className="micro">TU VISITA / RESUMEN</span>
        <h2 className="italic">{service?.name || "Elige tu servicio"}</h2>
        <dl className="summary-list">
          <dt>Duración</dt>
          <dd>{service?.durationMinutes} minutos</dd>
          <dt>Fecha</dt>
          <dd>
            {date
              ? new Intl.DateTimeFormat("es-MX", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${date}T12:00:00Z`))
              : "Por elegir"}
          </dd>
          <dt>Hora</dt>
          <dd>
            {selected
              ? formatInTimeZone(new Date(selected), TIMEZONE, "HH:mm")
              : "Por elegir"}
          </dd>
        </dl>
        <div className="summary-total">
          <span>{quote ? "Importe" : "Total"}</span>
          <strong>
            {quote
              ? service?.quoteLabel || "Por cotizar"
              : `${money(service?.priceCents || 0)} MXN`}
          </strong>
        </div>
        <p className="micro" style={{ marginTop: 20 }}>
          ESTILO Y GREÑA
          <br />
          GUADALUPE, NUEVO LEÓN
          <br />
          SIN NECESIDAD DE CREAR UNA CUENTA
        </p>
      </aside>
    </div>
  );
}
