import { cache } from "react";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./constants";
export const getSettings = cache(async () => {
  const rows = await db.siteSetting.findMany();
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
  };
});
export const getServices = cache(() =>
  db.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  }),
);
export const getGallery = cache(async () => {
  const [rows, settings] = await Promise.all([
    db.galleryImage.findMany({
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
    }),
    getSettings(),
  ]);
  return rows.length || settings.galleryManaged === "true"
    ? rows
        .filter((r) => r.isActive)
        .map((r) => ({
          id: r.id,
          url: r.url,
          alt: r.alt || "Trabajo de Estilo y Greña",
        }))
    : Array.from({ length: 14 }, (_, i) => ({
        id: `local-${i}`,
        url: `/images/cortes/corte-${String(i + 1).padStart(3, "0")}.jpeg`,
        alt: `Corte realizado en Estilo y Greña · ${i + 1}`,
      }));
});
