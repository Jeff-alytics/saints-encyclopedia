import { createClient, type Client, type InValue } from "@libsql/client/web";

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL || "http://localhost:8080",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

export { getDb as db };

export type Row = Record<string, unknown>;

export async function query<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const result = await getDb().execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryOne<T = Row>(sql: string, args: InValue[] = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}
