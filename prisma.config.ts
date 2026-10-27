import "./scripts/load-env";
import { defineConfig } from "prisma/config";
const application = new URL(process.env.DATABASE_URL!);
const direct = new URL(process.env.DIRECT_URL || application);
const normalizeHost = (host: string) => host.replace("-pooler.", ".");
if (
  normalizeHost(direct.hostname) !== normalizeHost(application.hostname) ||
  direct.pathname !== application.pathname
)
  throw new Error(
    "DIRECT_URL must point to the same database as DATABASE_URL.",
  );
const schema = application.searchParams.get("schema") || "public";
if (
  direct.searchParams.get("schema") &&
  direct.searchParams.get("schema") !== schema
)
  throw new Error("Migration and application schemas must match.");
direct.searchParams.set("schema", schema);
if (direct.hostname.endsWith(".neon.tech"))
  direct.hostname = direct.hostname.replace("-pooler.", ".");
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: direct.toString() },
});
