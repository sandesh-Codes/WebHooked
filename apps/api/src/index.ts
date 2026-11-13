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

app.listen(port, () => {
    console.log(`${SERVICE_NAME} api listening on port ${port}`);
});