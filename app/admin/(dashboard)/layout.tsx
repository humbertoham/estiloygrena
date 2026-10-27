import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="gothic admin-brand">
          Estilo y Greña
        </Link>
        <span className="micro">PANEL DE ADMINISTRADOR</span>
        <nav aria-label="Administración">
          {[
            ["Resumen", ""],
            ["Citas", "/citas"],
            ["Calendario", "/calendario"],
            ["Servicios", "/servicios"],
            ["Horarios", "/horarios"],
            ["Bloqueos", "/bloqueos"],
            ["Galería", "/galeria"],
            ["Configuración", "/configuracion"],
          ].map(([name, url]) => (
            <Link key={name} href={`/admin${url}`}>
              {name}
              <span>↗</span>
            </Link>
          ))}
        </nav>
        <Link href="/" className="text-link">
          Ver sitio ↗
        </Link>
        <form action={logout}>
          <button type="submit" className="button outline">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
