import "./scripts/load-env";
import { defineConfig } from "prisma/config";
import { migrationUrl } from "./lib/environment";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: migrationUrl(process.env.DATABASE_URL, process.env.DIRECT_URL),
  },
});
