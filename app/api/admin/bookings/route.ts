import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { assertOrigin } from "@/lib/security";
import { reserve } from "@/lib/bookings";
export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    assertOrigin(req);
    return NextResponse.json(await reserve(await req.json(), true));
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo crear la cita. Revisa los datos y elige un horario disponible.",
      },
      { status: 400 },
    );
  }
}
