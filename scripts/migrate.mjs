import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationsDirectory = path.resolve("db", "migrations");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const filenamesRows = await pool.query(
    "SELECT filename FROM schema_migrations",
  );
  const filenames = new Set(filenamesRows.rows.map((r) => r.filename));

  const files = (await readdir(migrationsDirectory))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;

  for (const file of files) {
    if (filenames.has(file)) continue;

    const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
      console.log("applied:", file);
      applied++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(
    applied === 0 ? "nothing to apply" : `filenames, applied ${applied}`,
  );
}

try {
  await main();
} finally {
  await pool.end();
}
