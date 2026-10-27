import Image from "next/image";
import { db } from "@/lib/db";
import { AdminTitle, Flash } from "@/components/admin";
import { saveService } from "../../actions";
import { money } from "@/lib/constants";
import type { Service } from "@/lib/generated/prisma/client";
function ServiceForm({ service }: { service?: Service }) {
  return (
    <form action={saveService} className="admin-form">
      <input type="hidden" name="id" value={service?.id || ""} />
      <div className="form-grid">
        <label className="field">
          Nombre
          <input
            name="name"
            defaultValue={service?.name}
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          Identificador (sin espacios)
          <input
            name="slug"
            defaultValue={service?.slug}
            required
            pattern="[a-z0-9-]+"
          />
        </label>
        <label className="field">
          Tipo de precio
          <select
            name="pricingType"
            defaultValue={service?.pricingType || "FIXED"}
          >
            <option value="FIXED">Precio fijo</option>
            <option value="QUOTE">Por cotización</option>
          </select>
        </label>
        <label className="field">
          Precio en MXN (solo precio fijo)
          <input
            name="price"
            type="number"
            min="1"
            step="0.01"
            defaultValue={service?.priceCents ? service.priceCents / 100 : ""}
          />
        </label>
        <label className="field">
          Duración en minutos
          <input
            name="durationMinutes"
            type="number"
            min="15"
            max="720"
            defaultValue={service?.durationMinutes || 60}
            required
          />
        </label>
        <label className="field">
          Orden
          <input
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={service?.displayOrder || 0}
          />
        </label>
      </div>
      <label className="field">
        Texto de cotización
        <input
          name="quoteLabel"
          defaultValue={service?.quoteLabel || "Se cotiza por WhatsApp"}
        />
      </label>
      <label className="field">
        Descripción
        <textarea
          name="description"
          defaultValue={service?.description || ""}
          maxLength={1000}
        />
      </label>
      <label className="field">
        Fotografía (JPG, PNG, WebP · hasta 4 MB)
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      {service?.imageUrl && (
        <div className="service-admin-photo">
          <Image
            src={service.imageUrl}
            alt={service.name}
            width={100}
            height={120}
          />
          <label className="check">
            <input name="removeImage" type="checkbox" />
            Quitar fotografía del servicio
          </label>
        </div>
      )}
      <label className="check">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={service?.isActive ?? true}
        />
        Servicio activo
      </label>
      <button className="button" type="submit">
        Guardar servicio
      </button>
    </form>
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const services = await db.service.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return (
    <>
      <AdminTitle
        title="Servicios"
        description="Los cambios no alteran los precios ni duraciones guardados en citas anteriores."
      />
      <Flash params={await searchParams} />
      <details className="admin-panel">
        <summary>＋ Agregar servicio</summary>
        <ServiceForm />
      </details>
      {services.map((s) => (
        <details className="admin-panel" key={s.id}>
          <summary>
            {s.name}
            <span>
              {s.pricingType === "QUOTE" ? "Por cotizar" : money(s.priceCents!)}{" "}
              · {s.durationMinutes} min · {s.isActive ? "Activo" : "Inactivo"}
            </span>
          </summary>
          <ServiceForm service={s} />
        </details>
      ))}
    </>
  );
}
