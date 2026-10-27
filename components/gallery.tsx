"use client";
import Image from "next/image";
import { useRef, useState } from "react";
type Photo = { id: string; url: string; alt: string };
export function Gallery({ images }: { images: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  return (
    <>
      <div className="gallery-grid">
        {images.map((p, i) => (
          <button
            className={`gallery-item gallery-item-${i % 5}`}
            key={p.id}
            onClick={() => {
              setSelected(p);
              dialog.current?.showModal();
            }}
            aria-label={`Ampliar: ${p.alt}`}
          >
            <div>
              <Image
                src={p.url}
                alt={p.alt}
                fill
                sizes="(max-width: 600px) 48vw, (max-width: 1000px) 32vw, 24vw"
              />
            </div>
            <span className="micro">
              {String(i + 1).padStart(3, "0")} / ESTILO Y GREÑA <span>＋</span>
            </span>
          </button>
        ))}
      </div>
      <dialog
        className="photo-dialog"
        ref={dialog}
        aria-label="Fotografía ampliada"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="dialog-close button"
          onClick={() => dialog.current?.close()}
        >
          Cerrar ×
        </button>
        {selected && (
          <Image
            src={selected.url}
            alt={selected.alt}
            width={1000}
            height={1200}
            sizes="90vw"
            style={{
              objectFit: "contain",
              maxHeight: "82dvh",
              width: "auto",
              maxWidth: "88vw",
            }}
          />
        )}
        <p>{selected?.alt}</p>
      </dialog>
    </>
  );
}
