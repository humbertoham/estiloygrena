import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export function secureEqual(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function assertOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ).origin;
  if (!origin || origin !== expected) throw new Error("Origen no permitido");
}
export async function rateLimit(key: string, limit: number, minutes = 15) {
  const now = new Date(),
    reset = new Date(+now + minutes * 60000);
  const digest = hash(key);
  const count = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${digest})::bigint)`;
      const row = await tx.rateLimit.findUnique({ where: { key: digest } });
      if (!row || row.resetAt < now) {
        await tx.rateLimit.upsert({
          where: { key: digest },
          create: { key: digest, count: 1, resetAt: reset },
          update: { count: 1, resetAt: reset },
        });
        return 1;
      }
      return (
        await tx.rateLimit.update({
          where: { key: digest },
          data: { count: { increment: 1 } },
        })
      ).count;
    },
    { timeout: 10000 },
  );
  if (count > limit)
    throw new Error("Demasiados intentos. Intenta de nuevo más tarde.");
}
