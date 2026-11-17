import { pool } from "./db.js";

console.log("worker starting");

const result = await pool.query(
  `SELECT d.id, d.attempt_count, e.type, e.payload, ep.url, ep.secret
   FROM deliveries d
   JOIN events e ON e.id = d.event_id
   JOIN endpoints ep ON ep.id = d.endpoint_id
   WHERE d.status = 'pending' AND d.next_attempt_at <= now()
   ORDER BY d.next_attempt_at
   LIMIT 1`
);

console.log(result.rows[0]);

await pool.end();