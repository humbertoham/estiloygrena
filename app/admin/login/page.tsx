import { login } from "../actions";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="admin-login">
      <Link href="/" className="gothic admin-brand">
        Estilo y Greña
      </Link>
      <div className="micro">ACCESO PRIVADO</div>
      <h1>Panel de administrador</h1>
      <p>Ingresa con las credenciales del salón.</p>
      {(await searchParams).error && (
        <p className="feedback error" role="alert">
          No se pudo iniciar sesión. Revisa tus credenciales o espera unos
          minutos si realizaste varios intentos.
        </p>
      )}
      <form action={login}>
        <label className="field">
          Usuario
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button className="button" type="submit">
          Iniciar sesión ↗
        </button>
      </form>
      <Link href="/" className="text-link">
        Volver al sitio
      </Link>
    </main>
  );
}
