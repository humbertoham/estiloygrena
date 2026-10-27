"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, createSession, clearSession } from "@/lib/auth";
import { secureEqual, rateLimit } from "@/lib/security";
import { availability, calendarLock, expireHolds } from "@/lib/scheduling";
import { zoned } from "@/lib/availability";
import { serviceSchema, dateSchema } from "@/lib/validation";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { uploadImage, deleteImage } from "@/lib/storage";
import { headers } from "next/headers";
const text = (f: FormData, k: string) => String(f.get(k) || "").trim();
const checked = (f: FormData, k: string) => f.get(k) === "on";
function done(path: string, message = "Cambios guardados") {
  revalidatePath("/", "layout");
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}
function fail(
  path: string,
  message = "No se pudo guardar. Revisa los datos e intenta de nuevo.",
): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
export async function login(f: FormData) {
  try {
    await rateLimit("admin-login:global", 50);
    await rateLimit(
      `admin-login:${(await headers()).get("x-forwarded-for")?.split(",")[0] || "local"}`,
      8,
    );
    const user = text(f, "username"),
      password = String(f.get("password") || "");
    if (
      !process.env.ADMIN_PASSWORD ||
      !process.env.ADMIN_USERNAME ||
      !secureEqual(user, process.env.ADMIN_USERNAME) ||
      !secureEqual(password, process.env.ADMIN_PASSWORD)
    )
      throw new Error("invalid");
    await createSession();
  } catch {
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}
export async function logout() {
  await clearSession();
  redirect("/admin/login");
}
export async function saveService(f: FormData) {
  await requireAdmin();
  try {
    const type = text(f, "pricingType"),
      price = text(f, "price");
    const data = serviceSchema.parse({
      name: text(f, "name"),
      slug: text(f, "slug"),
      description: text(f, "description"),
      pricingType: type,
      priceCents: type === "QUOTE" ? null : Math.round(Number(price) * 100),
      quoteLabel:
        type === "QUOTE"
          ? text(f, "quoteLabel") || "Se cotiza por WhatsApp"
          : null,
      durationMinutes: Number(text(f, "durationMinutes")),
      displayOrder: Number(text(f, "displayOrder")),
      isActive: checked(f, "isActive"),
    });
    const id = text(f, "id");
    const image = f.get("image");
    let photo: { imageUrl?: string | null; imageKey?: string | null } = {};
    if (image instanceof File && image.size) {
      const result = await uploadImage(
        Buffer.from(await image.arrayBuffer()),
        image.type,
      );
      photo = { imageUrl: result.url, imageKey: result.objectKey };
    } else if (checked(f, "removeImage"))
      photo = { imageUrl: null, imageKey: null };
    if (id)
      await db.service.update({ where: { id }, data: { ...data, ...photo } });
    else await db.service.create({ data: { ...data, ...photo } });
  } catch {
    fail(
      "/admin/servicios",
      "No se guardó el servicio. Revisa precio, duración, nombre único y fotografía (JPG, PNG o WebP, hasta 4 MB).",
    );
  }
  done("/admin/servicios");
}
export async function saveHours(f: FormData) {
  await requireAdmin();
  let affected = 0;
  try {
    const intervals: {
      weekday: number;
      startTime: string;
      endTime: string;
      sortOrder: number;
    }[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const raw = text(f, `day-${weekday}`);
      if (!raw) continue;
      const day = raw
        .split(",")
        .map((item, sortOrder) => {
          const parts = item
            .trim()
            .split("-")
            .map((s) => s.trim());
          if (
            parts.length !== 2 ||
            parts.some((s) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) ||
            parts[0] >= parts[1]
          )
            throw new Error("Invalid hours");
          return { weekday, startTime: parts[0], endTime: parts[1], sortOrder };
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (day.some((h, i) => i > 0 && day[i - 1].endTime > h.startTime))
        throw new Error("Overlap");
      intervals.push(...day);
    }
    await db.$transaction(async (tx) => {
      await calendarLock(tx);
      await tx.weeklySchedule.deleteMany();
      await tx.weeklySchedule.createMany({ data: intervals });
      affected = await tx.appointment.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { gte: new Date() },
        },
      });
    });
  } catch {
    fail(
      "/admin/horarios",
      "Usa intervalos HH:MM-HH:MM separados por comas, sin traslapes.",
    );
  }
  done(
    "/admin/horarios",
    affected
      ? `Horarios guardados. Revisa las ${affected} citas futuras existentes; ninguna fue cancelada.`
      : "Horarios guardados.",
  );
}
export async function saveException(f: FormData) {
  await requireAdmin();
  try {
    const date = dateSchema.parse(text(f, "date")),
      type = z.enum(["CLOSED", "CUSTOM_HOURS"]).parse(text(f, "type"));
    const startTime = text(f, "startTime"),
      endTime = text(f, "endTime");
    if (
      type === "CUSTOM_HOURS" &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
        startTime >= endTime)
    )
      throw new Error("Invalid");
    await db.$transaction(async (tx) => {
      await calendarLock(tx);
      await tx.scheduleException.create({
        data: {
          date: new Date(`${date}T00:00:00Z`),
          type,
          startTime: type === "CLOSED" ? null : startTime,
          endTime: type === "CLOSED" ? null : endTime,
          label: text(f, "label").slice(0, 200),
        },
      });
    });
  } catch {
    fail("/admin/horarios");
  }
  done(
    "/admin/horarios",
    "Excepción guardada. Las citas existentes se conservan; revisa la fecha en el calendario.",
  );
}
export async function removeException(f: FormData) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    await calendarLock(tx);
    await tx.scheduleException.delete({ where: { id: text(f, "id") } });
  });
  done("/admin/horarios");
}
export async function saveBlock(f: FormData) {
  await requireAdmin();
  let conflicts = 0;
  try {
    const startAt = zoned(
        dateSchema.parse(text(f, "startDate")),
        text(f, "startTime") || "00:00",
      ),
      endAt = zoned(
        dateSchema.parse(text(f, "endDate")),
        text(f, "endTime") || "00:00",
      );
    if (
      !Number.isFinite(+startAt) ||
      !Number.isFinite(+endAt) ||
      endAt <= startAt
    )
      throw new Error("Invalid");
    await db.$transaction(async (tx) => {
      await calendarLock(tx);
      await expireHolds(tx);
      conflicts = await tx.appointment.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (conflicts && !checked(f, "allowConflicts"))
        throw new Error("conflict");
      const id = text(f, "id");
      const data = { startAt, endAt, reason: text(f, "reason").slice(0, 200) };
      if (id) await tx.blockedPeriod.update({ where: { id }, data });
      else await tx.blockedPeriod.create({ data });
    });
  } catch {
    fail(
      "/admin/bloqueos",
      conflicts
        ? `El rango coincide con ${conflicts} cita(s). Revísalas en el calendario. Para guardar sin cancelarlas, marca la casilla de conservar citas.`
        : "Revisa las fechas y horas del bloqueo.",
    );
  }
  done(
    "/admin/bloqueos",
    conflicts
      ? `Bloqueo guardado; ${conflicts} cita(s) siguen activas y requieren revisión.`
      : "Bloqueo guardado.",
  );
}
export async function removeBlock(f: FormData) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    await calendarLock(tx);
    await tx.blockedPeriod.delete({ where: { id: text(f, "id") } });
  });
  done("/admin/bloqueos", "Horario desbloqueado.");
}
export async function updateAppointment(f: FormData) {
  await requireAdmin();
  try {
    const action = z
      .enum([
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
        "CASH_PAID",
        "REVIEWED",
      ])
      .parse(text(f, "action"));
    await db.$transaction(async (tx) => {
      await calendarLock(tx);
      await expireHolds(tx);
      const a = await tx.appointment.findUniqueOrThrow({
        where: { id: text(f, "id") },
      });
      if (action === "CASH_PAID") {
        if (
          a.paymentMethod !== "CASH" ||
          a.status === "CANCELLED" ||
          a.status === "EXPIRED"
        )
          throw new Error("Invalid");
        await tx.appointment.update({
          where: { id: a.id },
          data: { paymentStatus: "PAID" },
        });
      } else if (action === "REVIEWED") {
        const note = text(f, "resolution");
        if (note.length < 10) throw new Error("Missing note");
        await tx.paymentEvent.create({
          data: {
            externalEventId: `admin-${randomUUID()}`,
            eventType: "ADMIN_RECONCILIATION",
            paymentId: a.paymentId,
            payload: { appointmentId: a.id, resolution: note.slice(0, 1000) },
          },
        });
        await tx.appointment.update({
          where: { id: a.id },
          data: { needsReview: false },
        });
      } else {
        if (!["CONFIRMED", "PENDING"].includes(a.status))
          throw new Error("Terminal status");
        if (
          action === "CONFIRMED" &&
          a.paymentMethod === "MERCADO_PAGO" &&
          a.paymentStatus !== "PAID"
        )
          throw new Error("Payment unverified");
        await tx.appointment.update({
          where: { id: a.id },
          data: {
            status: action,
            needsReview:
              a.needsReview ||
              (action === "CANCELLED" && a.paymentStatus === "PAID"),
          },
        });
      }
    });
  } catch {
    fail(
      "/admin/citas",
      "No se cambió la cita. Las citas canceladas o expiradas no se reactivan, y los pagos en línea deben verificarse.",
    );
  }
  done("/admin/citas");
}
export async function rescheduleAppointment(f: FormData) {
  await requireAdmin();
  try {
    const date = dateSchema.parse(text(f, "date")),
      time = z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .parse(text(f, "time"));
    const target = zoned(date, time);
    await db.$transaction(
      async (tx) => {
        await calendarLock(tx);
        await expireHolds(tx);
        const a = await tx.appointment.findUniqueOrThrow({
          where: { id: text(f, "id") },
        });
        if (a.status !== "CONFIRMED") throw new Error("Inactive");
        // Preserve the booked duration when a service has since changed.
        const slots = await availability(
          tx,
          a.serviceId,
          date,
          a.id,
          a.serviceDurationSnapshot,
          true,
        );
        if (!slots.some((s) => +s === +target)) throw new Error("Unavailable");
        await tx.appointment.update({
          where: { id: a.id },
          data: {
            startAt: target,
            endAt: new Date(+target + a.serviceDurationSnapshot * 60000),
          },
        });
      },
      { timeout: 20000 },
    );
  } catch {
    fail(
      "/admin/citas",
      "No se pudo reprogramar. La cita debe estar confirmada y el horario completo disponible.",
    );
  }
  done("/admin/citas", "Cita reprogramada.");
}
export async function saveSettings(f: FormData) {
  await requireAdmin();
  try {
    const data: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) data[key] = text(f, key);
    z.object({
      businessName: z.string().min(2).max(100),
      description: z.string().max(500),
      address: z.string().min(10).max(500),
      whatsapp: z.string().regex(/^(\+?\d{10,15})?$/),
      instagram: z.union([
        z.literal(""),
        z
          .url()
          .refine(
            (s) =>
              new URL(s).protocol === "https:" &&
              ["instagram.com", "www.instagram.com"].includes(
                new URL(s).hostname,
              ),
          ),
      ]),
      mapsUrl: z
        .url()
        .refine(
          (s) =>
            new URL(s).protocol === "https:" &&
            ["www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(
              new URL(s).hostname,
            ),
        ),
      bookingInterval: z.enum(["15", "30", "60", "90"]),
      advanceNoticeMinutes: z.coerce.number().int().min(0).max(10080),
      maxAdvanceDays: z.coerce.number().int().min(1).max(365),
      bufferMinutes: z.coerce.number().int().min(0).max(120),
      cancellationPolicy: z.string().max(5000),
      privacyContact: z.string().max(500),
    }).parse(data);
    data.bookingEnabled = checked(f, "bookingEnabled") ? "true" : "false";
    data.developmentData = checked(f, "developmentData") ? "true" : "false";
    await db.$transaction(async (tx) => {
      await calendarLock(tx);
      for (const [key, value] of Object.entries(data))
        await tx.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
    });
  } catch {
    fail(
      "/admin/configuracion",
      "Revisa los campos: WhatsApp con código de país, enlaces HTTPS de Google Maps e Instagram, y límites de agenda.",
    );
  }
  done("/admin/configuracion");
}
export async function uploadGallery(f: FormData) {
  await requireAdmin();
  try {
    const file = f.get("image");
    if (!(file instanceof File)) throw new Error("missing");
    const image = await uploadImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    await db.siteSetting.upsert({
      where: { key: "galleryManaged" },
      create: { key: "galleryManaged", value: "true" },
      update: { value: "true" },
    });
    await db.galleryImage.create({
      data: {
        ...image,
        alt: text(f, "alt").slice(0, 300),
        displayOrder: Number(text(f, "displayOrder")) || 0,
      },
    });
  } catch {
    fail(
      "/admin/galeria",
      "No se pudo subir. Usa JPG, PNG o WebP de hasta 4 MB.",
    );
  }
  done("/admin/galeria");
}
export async function updateGallery(f: FormData) {
  await requireAdmin();
  try {
    await db.galleryImage.update({
      where: { id: text(f, "id") },
      data: {
        alt: text(f, "alt").slice(0, 300),
        displayOrder: z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(text(f, "displayOrder")),
        isActive: checked(f, "isActive"),
        isFeatured: checked(f, "isFeatured"),
      },
    });
  } catch {
    fail("/admin/galeria");
  }
  done("/admin/galeria");
}
export async function removeGallery(f: FormData) {
  await requireAdmin();
  if (!checked(f, "confirm"))
    fail("/admin/galeria", "Confirma la eliminación de esta fotografía.");
  try {
    const image = await db.galleryImage.findUniqueOrThrow({
      where: { id: text(f, "id") },
    });
    if (await db.service.count({ where: { imageUrl: image.url } }))
      throw new Error("In use");
    await deleteImage(image.objectKey);
    await db.galleryImage.delete({ where: { id: image.id } });
  } catch {
    fail(
      "/admin/galeria",
      "No se eliminó la imagen. Si un servicio la utiliza, quítala de ese servicio primero.",
    );
  }
  done("/admin/galeria", "Fotografía eliminada.");
}
