import { describe, it, expect } from "vitest";
import { environmentUrl, migrationUrl } from "../../lib/environment";
const pooled =
  "postgresql://test:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&schema=estilo_greenfield";
describe("deployment environment", () => {
  it.each([undefined, "", "   "])(
    "identifies missing DATABASE_URL without a generic Invalid URL error (%s)",
    (value) => {
      expect(() => environmentUrl("DATABASE_URL", value)).toThrow(
        "DATABASE_URL is missing",
      );
    },
  );
  it.each([
    "DATABASE_URL=postgresql://test:secret@host/db",
    '"postgresql://test:secret@host/db"',
    "not-a-url",
  ])("does not reveal invalid configuration values", (value) => {
    try {
      environmentUrl("DATABASE_URL", value);
      expect.fail("Expected configuration error");
    } catch (error) {
      expect((error as Error).message).toContain("DATABASE_URL");
      expect((error as Error).message).not.toContain(value);
      expect((error as Error).message).not.toContain("secret");
    }
  });
  it("requires a PostgreSQL URL and database name", () => {
    expect(() => environmentUrl("DATABASE_URL", "https://example.com")).toThrow(
      "PostgreSQL",
    );
    expect(() => environmentUrl("DATABASE_URL", "postgresql://host")).toThrow(
      "PostgreSQL",
    );
  });
  it("accepts whitespace around the URL", () =>
    expect(environmentUrl("DATABASE_URL", ` ${pooled}\n`).protocol).toBe(
      "postgresql:",
    ));
  it("derives a direct Neon endpoint and preserves the application schema", () => {
    const result = new URL(migrationUrl(pooled));
    expect(result.hostname).not.toContain("-pooler");
    expect(result.searchParams.get("schema")).toBe("estilo_greenfield");
  });
  it("adds the same schema to an explicit direct URL", () => {
    const direct = new URL(pooled);
    direct.hostname = direct.hostname.replace("-pooler", "");
    direct.searchParams.delete("schema");
    expect(
      new URL(migrationUrl(pooled, direct.toString())).searchParams.get(
        "schema",
      ),
    ).toBe("estilo_greenfield");
  });
  it("rejects a different database or schema", () => {
    expect(() =>
      migrationUrl(pooled, pooled.replace("/neondb", "/other")),
    ).toThrow("same database");
    expect(() =>
      migrationUrl(
        pooled,
        pooled.replace("schema=estilo_greenfield", "schema=public"),
      ),
    ).toThrow("schemas must match");
  });
  it("names malformed public URL configuration", () => {
    expect(() => environmentUrl("R2_PUBLIC_URL", "pub-example.r2.dev")).toThrow(
      "R2_PUBLIC_URL",
    );
    expect(() =>
      environmentUrl("NEXT_PUBLIC_APP_URL", "example.vercel.app"),
    ).toThrow("NEXT_PUBLIC_APP_URL");
  });
});
