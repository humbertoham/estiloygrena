import type { Metadata } from "next";
import { Location } from "@/components/location";
import { getSettings } from "@/lib/data";
export const metadata: Metadata = {
  title: "Ubicación",
  alternates: { canonical: "/ubicacion" },
};
export default async function Page() {
  return (
    <div className="inner-location">
      <h1 className="sr-only">Ubicación de Estilo y Greña</h1>
      <Location settings={await getSettings()} />
    </div>
  );
}
