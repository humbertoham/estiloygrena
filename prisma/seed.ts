import "../scripts/load-env";
import { db } from "../lib/db";
import { DEFAULT_SETTINGS } from "../lib/constants";
async function main() {
  if (
    new URL(process.env.DATABASE_URL!).searchParams.get("schema") !==
    "estilo_greenfield"
  )
    throw new Error(
      "Seed restricted to the isolated estilo_greenfield schema.",
    );
  const examples = [
    ["Corte Alternativo", "corte-alternativo", 35000, 60],
    ["Corte + Diseño", "corte-diseno", 45000, 90],
    ["Fleco", "fleco", 18000, 30],
    ["Color Fantasía", "color-fantasia", null, 180],
    ["Corrección de Color", "correccion-color", null, 240],
  ] as const;
  for (const [
    displayOrder,
    [name, slug, priceCents, durationMinutes],
  ] of examples.entries())
    await db.service.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        priceCents,
        durationMinutes,
        description: priceCents
          ? "Servicio de ejemplo. Confirma los detalles con el salón."
          : "Requiere valoración del largo, la base y la técnica.",
        pricingType: priceCents ? "FIXED" : "QUOTE",
        quoteLabel: priceCents ? null : "Se cotiza por WhatsApp",
        displayOrder,
      },
    });
  for (const [key, value] of Object.entries({
    ...DEFAULT_SETTINGS,
    developmentData: "true",
  }))
    await db.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  console.log(
    "Example services seeded without overwriting existing data. No business hours invented; booking disabled until configured.",
  );
}
main()
  .catch(() => {
    console.error("Seed failed; verify the isolated schema and migrations.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
