import { Router } from "express";
import { pool } from "../db.js";

export const eventsRouter = Router();

eventsRouter.post("/", async (req, res) => {
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
      [type, payload],
    );
    const event = eventResult.rows[0];

    const deliveryResult = await client.query(
      `INSERT INTO deliveries (event_id, endpoint_id)
      SELECT $1, id FROM endpoints WHERE is_active = true`,
      [event.id],
    );
    
    await client.query("COMMIT");
    
    res
    .status(201)
    .json({ event, deliveries_created: deliveryResult.rowCount });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});