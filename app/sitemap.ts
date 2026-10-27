import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/servicios",
    "/galeria",
    "/calendario",
    "/agendar",
    "/ubicacion",
    "/privacidad",
    "/politica-de-cancelacion",
  ].map((path) => ({
    url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`,
    changeFrequency: "weekly",
    priority: path ? 0.7 : 1,
  }));
}
