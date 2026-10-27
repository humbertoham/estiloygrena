import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const gothic = localFont({
  src: "../public/fonts/UnifrakturCook-Bold.ttf",
  variable: "--font-gothic",
  display: "swap",
});
const editorial = localFont({
  src: [
    { path: "../public/fonts/InstrumentSerif-Regular.ttf", style: "normal" },
    { path: "../public/fonts/InstrumentSerif-Italic.ttf", style: "italic" },
  ],
  variable: "--font-editorial",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Estilo y Greña — Peluquería en Guadalupe",
    template: "%s | Estilo y Greña",
  },
  description:
    "Cortes de cabello, diseño y color. Conoce nuestro trabajo y agenda tu cita en Guadalupe, Nuevo León.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Estilo y Greña",
    images: ["/opengraph-image"],
  },
  icons: { icon: "/favicon.ico" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-MX"
      data-scroll-behavior="smooth"
      className={`${gothic.variable} ${editorial.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
