export const TIMEZONE = "America/Monterrey";
export const ADDRESS =
  "Gral. Plutarco Elías Calles 3216, Riberas del Río, 67160 Guadalupe, Nuevo León, México";
export const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3595.621278120056!2d-100.2207976!3d25.6838462!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8662eb00694a3979%3A0xd8a886bc1beafee7!2sEstilo%20y%20Gre%C3%B1a!5e0!3m2!1ses-419!2smx!4v1790450181200!5m2!1ses-419!2smx";
export const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;
export const DEFAULT_SETTINGS: Record<string, string> = {
  businessName: "Estilo y Greña",
  description: "Peluquería en Guadalupe, Nuevo León",
  address: ADDRESS,
  whatsapp: "",
  instagram: "",
  mapsUrl: DIRECTIONS,
  bookingInterval: "60",
  advanceNoticeMinutes: "120",
  maxAdvanceDays: "60",
  bufferMinutes: "0",
  bookingEnabled: "false",
  cancellationPolicy:
    "Política provisional pendiente de revisión. Contacta al salón para solicitar cambios, cancelaciones o revisar un pago.",
  privacyContact: "",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : null;
}
