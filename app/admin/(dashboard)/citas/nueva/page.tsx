import { AdminTitle } from "@/components/admin";
import { BookingForm } from "@/components/booking-form";
import { getServices } from "@/lib/data";
import { localDate } from "@/lib/availability";
import { dateSchema } from "@/lib/validation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; hora?: string; servicio?: string }>;
}) {
  const p = await searchParams;
  return (
    <>
      <AdminTitle
        title="Crear cita"
        description="Reserva manual con los mismos controles de disponibilidad del sitio. Se puede usar aunque la agenda pública esté cerrada."
      />
      <div className="admin-panel">
        <BookingForm
          services={await getServices()}
          today={localDate()}
          enabled
          payments={false}
          admin
          initialService={p.servicio}
          initialDate={
            dateSchema.safeParse(p.fecha).success ? p.fecha : undefined
          }
          initialTime={/^\d{2}:\d{2}$/.test(p.hora || "") ? p.hora : undefined}
        />
      </div>
    </>
  );
}
