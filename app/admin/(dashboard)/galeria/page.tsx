import Image from "next/image";
import { db } from "@/lib/db";
import { AdminTitle, Flash } from "@/components/admin";
import { uploadGallery, updateGallery, removeGallery } from "../../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const images = await db.galleryImage.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return (
    <>
      <AdminTitle
        title="Galería"
        description="Fotografías almacenadas en R2. Los cambios de orden y visibilidad se reflejan en la galería pública."
      />
      <Flash params={await searchParams} />
      <section className="admin-panel">
        <h2>Subir fotografía</h2>
        <form action={uploadGallery}>
          <label className="field">
            Archivo (JPG, PNG, WebP · hasta 4 MB)
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Descripción de la imagen
              <input name="alt" required maxLength={300} />
            </label>
            <label className="field">
              Orden
              <input
                name="displayOrder"
                type="number"
                min="0"
                defaultValue={images.length}
              />
            </label>
          </div>
          <button className="button">Subir a R2</button>
        </form>
      </section>
      <div className="admin-gallery">
        {images.map((image) => (
          <section className="admin-panel" key={image.id}>
            <Image
              src={image.url}
              alt={image.alt || "Fotografía del salón"}
              width={320}
              height={360}
              sizes="(max-width: 700px) 90vw, 35vw"
            />
            <form action={updateGallery} className="admin-form">
              <input name="id" type="hidden" value={image.id} />
              <label className="field">
                Descripción
                <input
                  name="alt"
                  defaultValue={image.alt || ""}
                  maxLength={300}
                />
              </label>
              <label className="field">
                Orden
                <input
                  name="displayOrder"
                  type="number"
                  min="0"
                  defaultValue={image.displayOrder}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={image.isActive}
                />
                Visible
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={image.isFeatured}
                />
                Destacada
              </label>
              <button className="button">Guardar</button>
            </form>
            <details className="delete-photo">
              <summary>Eliminar fotografía</summary>
              <form action={removeGallery}>
                <input name="id" type="hidden" value={image.id} />
                <label className="check">
                  <input name="confirm" type="checkbox" required />
                  Eliminar permanentemente esta fotografía de R2 y la galería.
                </label>
                <button className="button outline">
                  Eliminar definitivamente
                </button>
              </form>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
