import { pool } from "./db.js";
import { signPayload } from "./sign.js";

const maxAttempts = 5;
const pollIntervalMilliseconds = 1000;
const leaseSeconds = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(): Promise<boolean> {
  const result = await pool.query(
    `WITH claimed AS (
       SELECT id
       FROM deliveries
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY next_attempt_at
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     ),
     leased AS (
       UPDATE deliveries d
       SET next_attempt_at = now() + make_interval(secs => $1)
       FROM claimed
       WHERE d.id = claimed.id
       RETURNING d.id, d.event_id, d.endpoint_id, d.attempt_count
     )
     SELECT l.id, l.attempt_count, e.type, e.payload, ep.url, ep.secret
     FROM leased l
     JOIN events e ON e.id = l.event_id
     JOIN endpoints ep ON ep.id = l.endpoint_id`,
    [leaseSeconds]
  );

  const delivery = result.rows[0];

  if (!delivery) return false;
  const body = JSON.stringify({ type: delivery.type, payload: delivery.payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(delivery.secret, timestamp, body);

  let errorMessage: string | null = null;
  try {
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

    if (!response.ok) {
      errorMessage = `HTTP ${response.status}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "unknown error";
  }


  const attempts = delivery.attempt_count + 1;

  if (errorMessage === null) {
    await pool.query(
      `UPDATE deliveries
         SET status = 'delivered', attempt_count = $2, last_error = NULL
         WHERE id = $1`,
      [delivery.id, attempts]
    );
    console.log("marked delivered:", delivery.id);
  } else if (attempts >= maxAttempts) {
    await pool.query(
      `UPDATE deliveries
         SET status = 'failed', attempt_count = $2, last_error = $3
         WHERE id = $1`,
      [delivery.id, attempts, errorMessage]
    );
    console.log("marked failed:", delivery.id, errorMessage);
  } else {
    const delaySeconds = 10 * 2 ** attempts;
    await pool.query(
      `UPDATE deliveries
         SET attempt_count = $2,
             last_error = $3,
             next_attempt_at = now() + make_interval(secs => $4)
         WHERE id = $1`,
      [delivery.id, attempts, errorMessage, delaySeconds]
    );
    console.log(`will retry in ${delaySeconds}s:`, delivery.id, errorMessage);
  }

  return true;
}


console.log("worker starting");

while (true) {
  try {
    const didWork = await processOne();
    if (!didWork) await sleep(pollIntervalMilliseconds);
  } catch (err) {
    console.error("worker error:", err);
    await sleep(pollIntervalMilliseconds);
  }
}