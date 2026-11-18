import { pool } from "./db.js";
import { signPayload } from "./sign.js";

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

const delivery = result.rows[0];

if (delivery) {
  const body = JSON.stringify({ type: delivery.type, payload: delivery.payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(delivery.secret, timestamp, body);

  const response = await fetch(delivery.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Timestamp": timestamp,
      "X-Webhook-Signature": signature,
    },
    body,
  });

  console.log("response status:", response.status);

   if (response.ok) {
    await pool.query(
      `UPDATE deliveries
       SET status = 'delivered', attempt_count = attempt_count + 1
       WHERE id = $1`,
      [delivery.id]
    );
    console.log("marked delivered:", delivery.id);
  }
}

await pool.end();