import "./load-env";
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env.local"))
  throw new Error(".env.local already exists; refusing to overwrite");
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("schema", "estilo_greenfield");
const lines = [
  `DATABASE_URL=${url.toString()}`,
  `ADMIN_USERNAME=${process.env.ADMIN_USERNAME || "admin"}`,
  `ADMIN_PASSWORD=${process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url")}`,
  `ADMIN_SESSION_SECRET=${process.env.ADMIN_SESSION_SECRET || randomBytes(48).toString("base64url")}`,
  `CRON_SECRET=${randomBytes(32).toString("base64url")}`,
];
writeFileSync(".env.local", lines.join("\n") + "\n", { mode: 0o600 });
console.log(
  "Local configuration created. Separate database schema: estilo_greenfield. Credentials saved only to ignored .env.local.",
);
