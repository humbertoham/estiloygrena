import Link from "next/link";
import Image from "next/image";
import { existsSync } from "node:fs";
import { PosterWall } from "./poster-wall";
import { getGallery, getSettings } from "@/lib/data";
const links = [
  ["Servicios", "/servicios"],
  ["Nuestros trabajos", "/galeria"],
  ["Calendario", "/calendario"],
  ["Ubicación", "/ubicacion"],
];
export function Brand({ name = "Estilo y Greña" }: { name?: string }) {
  return existsSync("public/logo.png") ? (
    <Image
      src="/logo.png"
      alt={name}
      width={160}
      height={70}
      className="brand-logo"
    />
  ) : (
    <span className="brand-fallback">{name}</span>
  );
}
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const [gallery, settings] = await Promise.all([getGallery(), getSettings()]);
  return (
    <>
      <PosterWall urls={gallery.map((p) => p.url)} />
      <a className="skip" href="#contenido">
        Ir al contenido
      </a>
      <header className="site-header">
        <Link href="/" aria-label="Estilo y Greña, inicio">
          <Brand name={settings.businessName} />
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {links.map(([t, h]) => (
            <Link href={h} key={h}>
              {t}
            </Link>
          ))}
        </nav>
        <Link href="/agendar" className="header-book">
          Agenda tu cita <span aria-hidden="true">↗</span>
        </Link>
        <details className="mobile-menu">
          <summary>
            Menú <span aria-hidden="true">＋</span>
          </summary>
          <nav aria-label="Navegación móvil">
            {links.map(([t, h]) => (
              <Link href={h} key={h}>
                {t}
              </Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="contenido">{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <span className="gothic">
            Nos vemos
            <br />
            <i>en el salón.</i>
          </span>
          <Link className="button light" href="/agendar">
            Agenda tu cita ↗
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            ESTILO Y GREÑA © {new Date().getFullYear()}
            <br />
            Guadalupe, Nuevo León · México
          </span>
          <nav aria-label="Información">
            <Link href="/privacidad">Aviso de privacidad</Link>
            <Link href="/politica-de-cancelacion">Cancelaciones y pagos</Link>
            <Link href="/admin">Panel de administrador</Link>
          </nav>
          <span className="footer-mark" aria-hidden="true">
            ✳
          </span>
        </div>
      </footer>
    </>
  );
}
