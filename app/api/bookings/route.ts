import { NextResponse } from "next/server";
import { assertOrigin, rateLimit } from "@/lib/security";
import { reserve } from "@/lib/bookings";
import { ZodError } from "zod";
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    await rateLimit(
      `bookings:${req.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
      12,
      30,
    );
    const result = await reserve(await req.json());
    return NextResponse.json(result);
  } catch (e) {
    const message =
      e instanceof ZodError
        ? e.issues[0].message
        : e instanceof Error &&
            !e.message.includes("prisma") &&
            !e.message.includes("Invalid")
          ? e.message
          : "No se pudo reservar. Vuelve a consultar los horarios.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
