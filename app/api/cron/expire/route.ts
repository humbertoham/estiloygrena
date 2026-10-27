import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarLock, expireHolds } from "@/lib/scheduling";
import { secureEqual } from "@/lib/security";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !secureEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const result = await db.$transaction(async (tx) => {
    await calendarLock(tx);
    return expireHolds(tx);
  });
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return NextResponse.json({ expired: result.count });
}
