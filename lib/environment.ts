type UrlName =
  "DATABASE_URL" | "DIRECT_URL" | "R2_PUBLIC_URL" | "NEXT_PUBLIC_APP_URL";

/** Validate deployment configuration without including credential values in errors. */
export function environmentUrl(name: UrlName, value: string | undefined): URL {
  const input = value?.trim();
  if (!input) {
    throw new Error(
      `${name} is missing. Set it in Vercel > Settings > Environment Variables for this deployment, then redeploy. Local .env files are not uploaded.`,
    );
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(
      `${name} is not a valid URL. Enter only the URL value, without the variable name or surrounding quotes.`,
    );
  }
  const postgres = name === "DATABASE_URL" || name === "DIRECT_URL";
  const protocols = postgres
    ? ["postgres:", "postgresql:"]
    : name === "R2_PUBLIC_URL"
      ? ["https:"]
      : ["http:", "https:"];
  if (
    !protocols.includes(url.protocol) ||
    !url.hostname ||
    (postgres && url.pathname.length < 2)
  ) {
    throw new Error(
      `${name} must be a complete ${postgres ? "PostgreSQL URL (postgresql://USER:PASSWORD@HOST/DATABASE)" : name === "R2_PUBLIC_URL" ? "public HTTPS URL (https://HOST)" : "HTTP or HTTPS URL (https://HOST)"}.`,
    );
  }
  return url;
}

export function migrationUrl(
  databaseUrl: string | undefined,
  directUrl?: string,
): string {
  const application = environmentUrl("DATABASE_URL", databaseUrl);
  const direct = directUrl?.trim()
    ? environmentUrl("DIRECT_URL", directUrl)
    : new URL(application);
  const normalizeHost = (host: string) => host.replace("-pooler.", ".");
  if (
    normalizeHost(direct.hostname) !== normalizeHost(application.hostname) ||
    direct.pathname !== application.pathname
  ) {
    throw new Error(
      "DIRECT_URL must point to the same database as DATABASE_URL.",
    );
  }
  const schema = application.searchParams.get("schema") || "public";
  if (
    direct.searchParams.has("schema") &&
    direct.searchParams.get("schema") !== schema
  ) {
    throw new Error("Migration and application schemas must match.");
  }
  direct.searchParams.set("schema", schema);
  if (direct.hostname.endsWith(".neon.tech"))
    direct.hostname = normalizeHost(direct.hostname);
  return direct.toString();
}
