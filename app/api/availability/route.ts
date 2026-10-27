import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { availability } from "@/lib/scheduling";
import { dateSchema } from "@/lib/validation";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const date = dateSchema.safeParse(p.get("date"));
  const service = p.get("service");
  if (!date.success || !service)
    return NextResponse.json(
      { error: "Selecciona servicio y fecha" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      {
        slots: (await availability(db, service, date.data)).map((s) =>
          s.toISOString(),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar la disponibilidad." },
      { status: 503 },
    );
  }
}
