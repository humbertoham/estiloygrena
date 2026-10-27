import type { Metadata } from "next";
import { BookingPage } from "@/components/booking-page";
export const metadata: Metadata = {
  title: "Agenda tu cita",
  alternates: { canonical: "/agendar" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  return <BookingPage service={(await searchParams).servicio} />;
}
