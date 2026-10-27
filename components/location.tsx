import { ADDRESS, DIRECTIONS, MAP_EMBED, whatsappLink } from "@/lib/constants";
export function Location({
  settings,
  embed = true,
}: {
  settings: Record<string, string>;
  embed?: boolean;
}) {
  const wa = whatsappLink(
    settings.whatsapp,
    "Hola, quiero información de Estilo y Greña.",
  );
  return (
    <section className="location-poster">
      <div className="location-copy">
        <div className="micro">04 / GUADALUPE, NUEVO LEÓN</div>
        <h2 className="italic">
          Aquí
          <br />
          nos vemos.
        </h2>
        <address>{settings.address || ADDRESS}</address>
        <div className="button-row">
          <a
            className="button light"
            href={settings.mapsUrl || DIRECTIONS}
            target="_blank"
            rel="noreferrer"
          >
            Cómo llegar ↗
          </a>
          {wa && (
            <a className="text-link" href={wa}>
              WhatsApp ↗
            </a>
          )}
          {settings.instagram && (
            <a
              className="text-link"
              href={settings.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
          )}
        </div>
      </div>
      {embed && (
        <iframe
          src={MAP_EMBED}
          title="Ubicación de Estilo y Greña en Guadalupe"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </section>
  );
}
