"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="inner-poster">
      <h1>No se pudo cargar esta página.</h1>
      <p>Intenta de nuevo en un momento.</p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
