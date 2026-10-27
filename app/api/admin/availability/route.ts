import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dateSchema } from "@/lib/validation";
import { availability } from "@/lib/scheduling";
import { db } from "@/lib/db";
export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = new URL(req.url).searchParams,
    date = dateSchema.safeParse(p.get("date"));
  if (!date.success || !p.get("service"))
    return NextResponse.json(
      { error: "Fecha o servicio inválido" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      {
        slots: (
          await availability(
            db,
            p.get("service")!,
            date.data,
            undefined,
            undefined,
            true,
          )
        ).map((s) => s.toISOString()),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar" },
      { status: 503 },
    );
  }
}
