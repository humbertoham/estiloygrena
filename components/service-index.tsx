import Link from "next/link";
import type { Service } from "@/lib/generated/prisma/client";
import { money } from "@/lib/constants";
export function ServiceIndex({
  services,
  compact = false,
}: {
  services: Service[];
  compact?: boolean;
}) {
  return (
    <div className="service-index">
      {services.slice(0, compact ? 3 : undefined).map((s, i) => (
        <Link
          className="service-row"
          href={`/agendar?servicio=${s.id}`}
          key={s.id}
        >
          <span className="service-number">
            {String(i + 1).padStart(2, "0")} /
          </span>
          <div>
            <h3>{s.name}</h3>
            {!compact && <p>{s.description}</p>}
            <span className="micro">{s.durationMinutes} MIN</span>
          </div>
          <span className="service-price">
            {s.pricingType === "QUOTE"
              ? s.quoteLabel || "Se cotiza por WhatsApp"
              : `${money(s.priceCents!)} MXN`}
            <span aria-hidden="true"> ↗</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
