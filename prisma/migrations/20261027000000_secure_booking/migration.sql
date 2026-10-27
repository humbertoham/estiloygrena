ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TABLE "Appointment" ADD COLUMN "publicTokenHash" TEXT, ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Appointment_publicTokenHash_key" ON "Appointment"("publicTokenHash");
CREATE TABLE "PaymentTransaction" (
  "id" TEXT PRIMARY KEY, "paymentId" TEXT NOT NULL UNIQUE, "appointmentId" TEXT NOT NULL REFERENCES "Appointment"("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PaymentTransaction_appointmentId_idx" ON "PaymentTransaction"("appointmentId");
CREATE TABLE "RateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "resetAt" TIMESTAMPTZ(3) NOT NULL);
ALTER TABLE "Service" ADD CONSTRAINT "Service_valid_pricing" CHECK (("pricingType" = 'QUOTE' AND "priceCents" IS NULL) OR ("pricingType" = 'FIXED' AND "priceCents" > 0));
ALTER TABLE "Service" ADD CONSTRAINT "Service_valid_duration" CHECK ("durationMinutes" > 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_valid_range" CHECK ("endAt" > "startAt");
ALTER TABLE "BlockedPeriod" ADD CONSTRAINT "BlockedPeriod_valid_range" CHECK ("endAt" > "startAt");
