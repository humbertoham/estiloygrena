import "./load-env";
import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get("schema") || "public";
  if (!/^[a-z_][a-z0-9_]*$/.test(schema))
    throw new Error("Invalid schema name");
  const tables =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema=${schema} ORDER BY table_name`;
  console.log(
    `Database reachable. Schema: ${schema}. Tables:`,
    tables.map((r) => r.table_name),
  );
  if (tables.some((r) => r.table_name === "_prisma_migrations"))
    console.log(
      "Migration history:",
      await sql.query(
        `SELECT migration_name, finished_at IS NOT NULL AS finished FROM "${schema}"."_prisma_migrations" ORDER BY migration_name`,
      ),
    );
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  await s3.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }));
  const objects = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1,
    }),
  );
  console.log("R2 bucket reachable; objects present:", !!objects.KeyCount);
  console.log(
    "Configuration presence:",
    Object.fromEntries(
      [
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD",
        "ADMIN_SESSION_SECRET",
        "MERCADO_PAGO_ACCESS_TOKEN",
        "MERCADO_PAGO_WEBHOOK_SECRET",
        "R2_PUBLIC_URL",
      ].map((k) => [k, !!process.env[k]]),
    ),
  );
}
main().catch((e) => {
  console.error(
    "Integration check failed:",
    e.name,
    e.code || e.$metadata?.httpStatusCode || "connection error",
  );
  process.exitCode = 1;
});
