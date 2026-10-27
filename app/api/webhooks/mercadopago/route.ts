import { NextResponse } from "next/server";
import { processPayment, validSignature } from "@/lib/payments";
export async function POST(req: Request) {
  const id = new URL(req.url).searchParams.get("data.id") || "";
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (
    !secret ||
    !validSignature(
      id,
      req.headers.get("x-request-id") || "",
      req.headers.get("x-signature") || "",
      secret,
    )
  )
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  if (!/^\d+$/.test(id))
    return NextResponse.json(
      { error: "Identificador inválido" },
      { status: 400 },
    );
  try {
    await processPayment(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar el pago" },
      { status: 503 },
    );
  }
}
