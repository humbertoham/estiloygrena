import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { environmentUrl } from "./environment";
const databaseUrl = environmentUrl("DATABASE_URL", process.env.DATABASE_URL);
neonConfig.webSocketConstructor = ws;
const globalDb = globalThis as unknown as { db?: PrismaClient };
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaNeon(
      { connectionString: databaseUrl.toString() },
      {
        schema: databaseUrl.searchParams.get("schema") || "public",
      },
    ),
  });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
