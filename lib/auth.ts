import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
const COOKIE = "eg_admin";
function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error(
      "Configura ADMIN_SESSION_SECRET con al menos 32 caracteres",
    );
  return new TextEncoder().encode(s);
}
export async function createSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("estilo-y-grena")
    .setAudience("admin")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function isAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "estilo-y-grena",
      audience: "admin",
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
