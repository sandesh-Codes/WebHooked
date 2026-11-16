import express from "express";
import { pool } from "./db.js";
import { randomBytes } from "node:crypto";
import { SERVICE_NAME } from "@my-project/shared";

const app = express();
app.use(express.json());

const port = 3000;


app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME })
});

app.get("/health/db", async (_req, res) => {
  const result = await pool.query("SELECT 1 AS ok");
  res.json({ db: result.rows[0] });
});

app.post("/endpoints", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const secret = randomBytes(24).toString("hex");

  const result = await pool.query(
    "INSERT INTO endpoints (url, secret) VALUES ($1, $2) RETURNING id, url, secret, is_active, created_at",
    [url, secret],
  );

  res.status(201).json(result.rows[0]);
});

app.get("/endpoints", async (_req, res) => {
  const result = await pool.query(
    "SELECT id, url, is_active, created_at FROM endpoints ORDER BY created_at DESC",
  );

  res.json(result.rows);
});

app.post("/events", async (req, res) => {
  const { type, payload } = req.body;

  if (!type || payload === undefined) {
    res.status(400).json({ error: "type and payload are required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `INSERT INTO events (type, payload)
       VALUES ($1, $2)
       RETURNING id, type, payload, created_at`,
      [type, payload]
    );
    const event = eventResult.rows[0];

    const deliveryResult = await client.query(
      `INSERT INTO deliveries (event_id, endpoint_id)
       SELECT $1, id FROM endpoints WHERE is_active = true`,
      [event.id]
    );

    await client.query("COMMIT");

    res.status(201).json({ event, deliveries_created: deliveryResult.rowCount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "failed to create event" });
  } finally {
    client.release();
  }
});




  app.listen(port, () => {
    console.log(`${SERVICE_NAME} api listening on port ${port}`);
  });