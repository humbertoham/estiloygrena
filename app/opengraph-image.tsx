import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#f0eee9",
        color: "#000",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "55px",
        border: "20px solid black",
      }}
    >
      <div
        style={{
          fontSize: 23,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>PELUQUERÍA / GUADALUPE, NUEVO LEÓN</span>
        <span>✳</span>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "serif",
          fontStyle: "italic",
          fontSize: 145,
          lineHeight: 1,
        }}
      >
        Estilo y Greña
      </div>
      <div style={{ fontSize: 27, display: "flex" }}>
        CORTES / DISEÑO / COLOR — AGENDA TU CITA ↗
      </div>
    </div>,
    size,
  );
}
