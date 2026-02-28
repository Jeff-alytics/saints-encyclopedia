#!/usr/bin/env node
/**
 * Upload local saints_encyclopedia.db to Turso.
 *
 * Usage:
 *   node scripts/upload-to-turso.mjs
 *
 * Requires env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 * Or pass them as arguments:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/upload-to-turso.mjs
 */

import { createClient } from "@libsql/client/web";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Error: Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

const DB_PATH = resolve(__dirname, "../../scraper/saints_encyclopedia.db");

console.log(`Source DB: ${DB_PATH}`);
console.log(`Target: ${TURSO_URL}`);

// Use sqlite3 CLI to dump the database as SQL
console.log("\nDumping local database to SQL...");
let sqlDump;
try {
  sqlDump = execSync(`sqlite3 "${DB_PATH}" .dump`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: "utf-8",
  });
} catch (e) {
  console.error(
    "Error: sqlite3 CLI not found. Install SQLite3 or use an alternative method."
  );
  console.error("On Windows: winget install SQLite.SQLite");
  console.error(
    "\nAlternative: Use the Turso dashboard to upload the .db file directly."
  );
  process.exit(1);
}

console.log(`SQL dump size: ${(sqlDump.length / 1024 / 1024).toFixed(1)} MB`);

// Connect to Turso
const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

// Split into individual statements
const statements = sqlDump
  .split(";\n")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"))
  .map((s) => (s.endsWith(";") ? s : s + ";"));

console.log(`\nExecuting ${statements.length} statements...`);

// Execute in batches
const BATCH_SIZE = 20;
let executed = 0;
let errors = 0;

for (let i = 0; i < statements.length; i += BATCH_SIZE) {
  const batch = statements.slice(i, i + BATCH_SIZE);
  try {
    await db.batch(batch.map((sql) => ({ sql, args: [] })));
    executed += batch.length;
  } catch (e) {
    // Try statements individually on batch failure
    for (const sql of batch) {
      try {
        await db.execute({ sql, args: [] });
        executed++;
      } catch (innerErr) {
        // Skip expected errors like "table already exists"
        const msg = String(innerErr);
        if (!msg.includes("already exists") && !msg.includes("TRANSACTION")) {
          errors++;
          if (errors <= 5) {
            console.error(
              `  Error: ${msg.substring(0, 100)}...`
            );
          }
        }
        executed++;
      }
    }
  }

  if (executed % 200 === 0 || i + BATCH_SIZE >= statements.length) {
    process.stdout.write(
      `\r  Progress: ${executed}/${statements.length} statements (${errors} errors)`
    );
  }
}

console.log(`\n\nDone! Executed ${executed} statements with ${errors} errors.`);

// Verify
const result = await db.execute("SELECT COUNT(*) as count FROM games");
console.log(`\nVerification: ${result.rows[0].count} games in Turso database`);

const players = await db.execute("SELECT COUNT(*) as count FROM players");
console.log(`             ${players.rows[0].count} players in Turso database`);

process.exit(0);
