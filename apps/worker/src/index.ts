import { pool } from "./db.js";

console.log("worker starting");

const result = await pool.query(
  "SELECT count(*) FROM deliveries WHERE status = 'pending'"
);
console.log("pending deliveries:", result.rows[0].count);

await pool.end();