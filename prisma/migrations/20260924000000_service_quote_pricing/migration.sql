-- Add quote pricing without rewriting or deleting existing service data.
CREATE TYPE "ServicePricingType" AS ENUM ('FIXED', 'QUOTE');

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'QUOTE';

ALTER TABLE "Service"
  ADD COLUMN "pricingType" "ServicePricingType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "quoteLabel" TEXT,
  ALTER COLUMN "priceCents" DROP NOT NULL;

ALTER TABLE "Appointment"
  ADD COLUMN "servicePricingTypeSnapshot" "ServicePricingType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "serviceQuoteLabelSnapshot" TEXT,
  ALTER COLUMN "servicePriceSnapshot" DROP NOT NULL,
  ALTER COLUMN "amountCents" DROP NOT NULL;

-- Existing rows remain fixed-price records and retain their numeric snapshots.
UPDATE "Service" SET "pricingType" = 'FIXED' WHERE "priceCents" IS NOT NULL;
UPDATE "Appointment" SET "servicePricingTypeSnapshot" = 'FIXED' WHERE "servicePriceSnapshot" IS NOT NULL;
