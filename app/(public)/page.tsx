import Link from "next/link";
import Image from "next/image";
import { getServices, getGallery, getSettings } from "@/lib/data";
import { ServiceIndex } from "@/components/service-index";
import { Location } from "@/components/location";
import { Reveal } from "@/components/reveal";
import { ADDRESS } from "@/lib/constants";
export default async function Home() {
  const [services, images, settings] = await Promise.all([
    getServices(),
    getGallery(),
    getSettings(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HairSalon",
            name: settings.businessName,
            address: {
              "@type": "PostalAddress",
              streetAddress: ADDRESS,
              addressLocality: "Guadalupe",
              addressRegion: "Nuevo León",
              postalCode: "67160",
              addressCountry: "MX",
            },
            url: process.env.NEXT_PUBLIC_APP_URL,
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className="hero-composition" aria-labelledby="hero-title">
        <div className="hero-side-label" aria-hidden="true">
          PELUQUERÍA / GUADALUPE, N.L. / MÉXICO
        </div>
        <div className="hero-poster">
          <div className="poster-meta">
            <span>EST. GUADALUPE, N.L.</span>
            <span>25°41′ N / 100°13′ O</span>
          </div>
          <span className="hero-star" aria-hidden="true">
            ✳
          </span>
          <h1 id="hero-title">
            <span className="gothic hero-estilo">Estilo</span>
            <span className="italic hero-grena">y Greña</span>
          </h1>
          <div className="hero-description">
            <p>
              Peluquería en
              <br />
              Guadalupe, Nuevo León.
            </p>
            <Link href="/agendar" className="button">
              Agenda tu cita <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="poster-bottom micro">
            <span>CORTES / DISEÑO / COLOR</span>
            <span>CONOCE NUESTRO TRABAJO ↓</span>
          </div>
        </div>
        <div className="hero-caption">
          <span>01 — ESTILO Y GREÑA</span>
          <span>Cabello real. Trabajo del salón.</span>
        </div>
        <Link href="/galeria" className="photo-stamp">
          <span className="micro">ARCHIVO DEL SALÓN</span>
          <span className="italic">
            Nuestros
            <br />
            trabajos ↗
          </span>
        </Link>
      </section>
      <Reveal className="services-composition">
        <section className="services-poster">
          <div className="section-heading">
            <span className="micro">02 / ELIGE TU SERVICIO</span>
            <span aria-hidden="true">＋</span>
          </div>
          <h2 className="gothic section-title">
            Servicios<span className="italic">del salón.</span>
          </h2>
          {settings.developmentData === "true" && (
            <p className="notice">
              Catálogo de muestra · precios y duraciones pendientes de
              confirmación.
            </p>
          )}
          <ServiceIndex services={services} compact />
          <Link href="/servicios" className="text-link">
            Ver todos los servicios ↗
          </Link>
        </section>
        <div
          className={images.length ? "service-cutout" : "service-cutout empty"}
        >
          {images.length > 0 && (
            <Image
              src={images[5]?.url || images[0].url}
              alt={images[5]?.alt || images[0].alt}
              fill
              sizes="(max-width: 700px) 80vw, 30vw"
            />
          )}
          <span className="micro">CORTE / ARCHIVO 006</span>
        </div>
      </Reveal>
      <Reveal className="gallery-composition">
        <section className="contact-poster">
          <div className="section-heading">
            <span className="micro">03 / FOTOGRAFÍAS ORIGINALES</span>
            <Link href="/galeria" className="text-link">
              Ver galería ↗
            </Link>
          </div>
          <h2 className="gallery-title">
            <span className="italic">Nuestros</span>
            <span className="gothic">trabajos</span>
            <span className="gallery-asterisk" aria-hidden="true">
              ✷
            </span>
          </h2>
          <div className="contact-preview">
            {[0, 3, 7, 10, 12]
              .filter(() => images.length > 0)
              .map((n, i) => (
                <Link
                  href="/galeria"
                  className={`contact-photo photo-${i}`}
                  key={n}
                >
                  <div>
                    <Image
                      src={images[n % images.length].url}
                      alt={images[n % images.length].alt}
                      fill
                      sizes="(max-width: 600px) 45vw, 20vw"
                    />
                  </div>
                  <span className="micro">
                    EG — {String(n + 1).padStart(3, "0")} <span>＋</span>
                  </span>
                </Link>
              ))}
          </div>
          <div className="contact-caption micro">
            CORTES Y COLOR REALIZADOS EN ESTILO Y GREÑA{" "}
            <span>© ARCHIVO DEL SALÓN</span>
          </div>
        </section>
      </Reveal>
      <Reveal className="location-composition">
        <Location settings={settings} />
      </Reveal>
      <section className="booking-strip">
        <span className="micro">TU PRÓXIMA VISITA</span>
        <h2 className="italic">
          Elige el día.
          <br />
          Nos vemos aquí.
        </h2>
        <Link href="/agendar" className="button">
          Consultar horarios ↗
        </Link>
      </section>
    </>
  );
}
