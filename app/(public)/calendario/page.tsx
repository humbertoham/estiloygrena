import type { Metadata } from "next";
import { BookingPage } from "@/components/booking-page";
export const metadata: Metadata = {
  title: "Calendario",
  alternates: { canonical: "/calendario" },
};
export default function Page() {
  return <BookingPage calendar />;
}
