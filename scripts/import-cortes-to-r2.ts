import "./load-env";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "../lib/db";
import { uploadImage } from "../lib/storage";
async function main() {
  const names = (await readdir("public/images/cortes"))
    .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
    .sort();
  for (const [displayOrder, name] of names.entries()) {
    const bytes = await readFile(`public/images/cortes/${name}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const key = `gallery/${digest}.webp`;
    if (await db.galleryImage.findUnique({ where: { objectKey: key } }))
      continue;
    const image = await uploadImage(
      bytes,
      /\.png$/i.test(name)
        ? "image/png"
        : /\.webp$/i.test(name)
          ? "image/webp"
          : "image/jpeg",
      key,
    );
    await db.galleryImage.upsert({
      where: { objectKey: key },
      update: {},
      create: {
        ...image,
        alt: `Trabajo realizado en Estilo y Greña · ${displayOrder + 1}`,
        displayOrder,
      },
    });
    console.log("Imported", name);
  }
  await db.siteSetting.upsert({
    where: { key: "galleryManaged" },
    create: { key: "galleryManaged", value: "true" },
    update: { value: "true" },
  });
  console.log("Import complete. Original files preserved.");
}
main()
  .catch(() => {
    console.error("Import failed; verify R2 and database configuration.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
