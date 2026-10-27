import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";
import { getGallery } from "@/lib/data";
export const metadata: Metadata = {
  title: "Nuestros trabajos",
  alternates: { canonical: "/galeria" },
};
export default async function Page() {
  const images = await getGallery();
  return (
    <section className="inner-poster gallery-page">
      <div className="micro">CONTACTOS / ARCHIVO DEL SALÓN</div>
      <h1 className="display-heading italic">
        Nuestros <span className="gothic">trabajos.</span>
      </h1>
      <p>
        Cortes, diseño y color realizados en Estilo y Greña. Toca una foto para
        verla de cerca.
      </p>
      {images.length ? (
        <Gallery images={images} />
      ) : (
        <p>El salón está actualizando sus fotografías.</p>
      )}
    </section>
  );
}
