import "./load-env";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { neon, Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readdir, readFile } from "node:fs/promises";
neonConfig.webSocketConstructor = ws;
const schema = `estilo_test_${randomBytes(8).toString("hex")}`;
const sql = neon(process.env.DATABASE_URL!);
if (!/^estilo_test_[a-f0-9]{16}$/.test(schema))
  throw new Error("Invalid test namespace");
const existing =
  await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name=${schema}`;
if (existing.length)
  throw new Error("Test schema already exists; refusing to use it.");
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("schema", schema);
const direct = new URL(url);
direct.hostname = direct.hostname.replace("-pooler.", ".");
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  DIRECT_URL: direct.toString(),
  TEST_DATABASE_SCHEMA: schema,
  E2E_BASE_URL: "http://localhost:3100",
  NEXT_PUBLIC_APP_URL: "http://localhost:3100",
  ADMIN_USERNAME: "test-admin",
  ADMIN_PASSWORD: randomBytes(24).toString("base64url"),
  ADMIN_SESSION_SECRET: randomBytes(48).toString("base64url"),
  MERCADO_PAGO_ACCESS_TOKEN: "TEST-isolated-no-real-payments",
  MERCADO_PAGO_WEBHOOK_SECRET: "test-webhook-secret",
  ALLOW_LIVE_PAYMENTS: "false",
};
function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Verification phase failed (${code})`)),
    );
    child.on("error", reject);
  });
}
let created = false;
async function migrateTestSchema() {
  // The schema was created by this process and has a unique random name.
  // Run the real migration SQL on one connection, scoped to this schema.
  // This avoids contending with unrelated Prisma deployments' database-wide lock.
  const client = new Client({ connectionString: direct.toString() });
  await client.connect();
  try {
    for (const name of (await readdir("prisma/migrations")).sort()) {
      if (!/^\d+_/.test(name)) continue;
      await client.query("BEGIN");
      try {
        await client.query(`SET LOCAL search_path TO "${schema}", public`);
        await client.query(
          await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await client.end();
  }
  console.log("Real migration SQL applied to the disposable test schema.");
}
try {
  await sql.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  await migrateTestSchema();
  await run(["node_modules/vitest/vitest.mjs", "run"]);
  await run(["node_modules/tsx/dist/cli.mjs", "scripts/seed-test.ts"]);
  await run(["node_modules/@playwright/test/cli.js", "test"]);
  console.log("All isolated verification phases passed.");
} catch {
  console.error("Verification failed. See test results above.");
  process.exitCode = 1;
} finally {
  if (created) {
    await sql.query(`DROP SCHEMA "${schema}" CASCADE`);
    console.log("Disposable test schema removed. Existing schemas preserved.");
  }
}
