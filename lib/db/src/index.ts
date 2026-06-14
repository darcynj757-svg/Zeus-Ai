import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useNeon =
  url.includes("neon.tech") || process.env.USE_NEON === "1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

if (useNeon) {
  const { neonConfig, Pool: NeonPool } = await import("@neondatabase/serverless");
  const wsModule = await import("ws");
  neonConfig.webSocketConstructor = wsModule.default;
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  pool = new NeonPool({ connectionString: url });
  db = drizzle(pool, { schema });
  console.log("[db] driver: neon-serverless");
} else {
  const { default: pg } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  pool = new pg.Pool({ connectionString: url });
  db = drizzle(pool, { schema });
  console.log("[db] driver: node-postgres");
}

export { db, pool };
export * from "./schema";
