import "./load-env";
import { db } from "../lib/db";
import { DEFAULT_SETTINGS } from "../lib/constants";
if (!/^estilo_test_[a-f0-9]+$/.test(process.env.TEST_DATABASE_SCHEMA || ""))
  throw new Error("Refusing to seed a non-test database");
await db.paymentEvent.deleteMany();
await db.paymentTransaction.deleteMany();
await db.appointment.deleteMany();
await db.blockedPeriod.deleteMany();
await db.scheduleException.deleteMany();
await db.weeklySchedule.deleteMany();
await db.service.deleteMany();
await db.siteSetting.deleteMany();
await db.service.createMany({
  data: [
    {
      id: "test-fixed",
      name: "Corte de prueba",
      slug: "test-fixed",
      description: "Datos aislados de prueba",
      pricingType: "FIXED",
      priceCents: 35000,
      durationMinutes: 60,
    },
    {
      id: "test-quote",
      name: "Color de prueba",
      slug: "test-quote",
      description: "Datos aislados de prueba",
      pricingType: "QUOTE",
      priceCents: null,
      quoteLabel: "Se cotiza por WhatsApp",
      durationMinutes: 180,
    },
  ],
});
await db.weeklySchedule.createMany({
  data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    startTime: "08:00",
    endTime: "20:00",
  })),
});
for (const [key, value] of Object.entries({
  ...DEFAULT_SETTINGS,
  bookingEnabled: "true",
  advanceNoticeMinutes: "0",
  developmentData: "true",
}))
  await db.siteSetting.create({ data: { key, value } });
await db.$disconnect();
console.log("Isolated E2E fixtures prepared.");
