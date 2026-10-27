CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MERCADO_PAGO');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_REQUIRED');
CREATE TYPE "ExceptionType" AS ENUM ('CLOSED', 'CUSTOM_HOURS');

CREATE TABLE "Service" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT NOT NULL, "priceCents" INTEGER NOT NULL, "durationMinutes" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "displayOrder" INTEGER NOT NULL DEFAULT 0, "imageKey" TEXT, "imageUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Service_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Appointment" ("id" TEXT NOT NULL, "bookingCode" TEXT NOT NULL, "customerName" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT, "instagram" TEXT, "notes" TEXT, "serviceId" TEXT NOT NULL, "serviceNameSnapshot" TEXT NOT NULL, "servicePriceSnapshot" INTEGER NOT NULL, "serviceDurationSnapshot" INTEGER NOT NULL, "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'America/Monterrey', "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING', "paymentMethod" "PaymentMethod" NOT NULL, "paymentStatus" "PaymentStatus" NOT NULL, "amountCents" INTEGER NOT NULL, "paymentPreferenceId" TEXT, "paymentId" TEXT, "pendingExpiresAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "WeeklySchedule" ("id" TEXT NOT NULL, "weekday" INTEGER NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ScheduleException" ("id" TEXT NOT NULL, "date" DATE NOT NULL, "type" "ExceptionType" NOT NULL, "startTime" TEXT, "endTime" TEXT, "label" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id"));
CREATE TABLE "BlockedPeriod" ("id" TEXT NOT NULL, "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BlockedPeriod_pkey" PRIMARY KEY ("id"));
CREATE TABLE "GalleryImage" ("id" TEXT NOT NULL, "objectKey" TEXT NOT NULL, "url" TEXT NOT NULL, "alt" TEXT, "width" INTEGER, "height" INTEGER, "isActive" BOOLEAN NOT NULL DEFAULT true, "isFeatured" BOOLEAN NOT NULL DEFAULT false, "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SiteSetting" ("key" TEXT NOT NULL, "value" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key"));
CREATE TABLE "PaymentEvent" ("id" TEXT NOT NULL, "externalEventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "paymentId" TEXT, "payload" JSONB NOT NULL, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
CREATE INDEX "Service_isActive_displayOrder_idx" ON "Service"("isActive", "displayOrder");
CREATE UNIQUE INDEX "Appointment_bookingCode_key" ON "Appointment"("bookingCode");
CREATE UNIQUE INDEX "Appointment_paymentPreferenceId_key" ON "Appointment"("paymentPreferenceId");
CREATE UNIQUE INDEX "Appointment_paymentId_key" ON "Appointment"("paymentId");
CREATE INDEX "Appointment_startAt_endAt_idx" ON "Appointment"("startAt", "endAt");
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");
CREATE INDEX "Appointment_paymentStatus_pendingExpiresAt_idx" ON "Appointment"("paymentStatus", "pendingExpiresAt");
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");
CREATE INDEX "WeeklySchedule_weekday_sortOrder_idx" ON "WeeklySchedule"("weekday", "sortOrder");
CREATE INDEX "ScheduleException_date_idx" ON "ScheduleException"("date");
CREATE UNIQUE INDEX "ScheduleException_date_type_startTime_endTime_key" ON "ScheduleException"("date", "type", "startTime", "endTime");
CREATE INDEX "BlockedPeriod_startAt_endAt_idx" ON "BlockedPeriod"("startAt", "endAt");
CREATE UNIQUE INDEX "GalleryImage_objectKey_key" ON "GalleryImage"("objectKey");
CREATE INDEX "GalleryImage_isActive_displayOrder_idx" ON "GalleryImage"("isActive", "displayOrder");
CREATE UNIQUE INDEX "PaymentEvent_externalEventId_key" ON "PaymentEvent"("externalEventId");
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL enforces overlap protection even when two booking requests race.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_no_active_overlap" EXCLUDE USING gist (tstzrange("startAt", "endAt", '[)') WITH &&) WHERE ("status" IN ('PENDING', 'CONFIRMED'));
