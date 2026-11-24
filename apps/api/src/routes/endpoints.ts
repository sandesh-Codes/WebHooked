import { Router } from "express";
import { pool } from "../db.js";
import { randomBytes } from "node:crypto";

export const endpointsRouter = Router();

endpointsRouter.post("/", async (req, res) => {
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

endpointsRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    "SELECT id, url, is_active, created_at FROM endpoints ORDER BY created_at DESC",
  );

  res.json(result.rows);
});