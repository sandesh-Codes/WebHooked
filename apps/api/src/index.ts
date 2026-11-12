import express from "express";
import { pool } from "./db.js";
import { SERVICE_NAME } from "@my-project/shared";

const app = express();
const port = 3000;

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME })
});

app.get("/health/db", async (_req, res) => {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ db: result.rows[0] });
});

app.listen(port, () => {
    console.log(`${SERVICE_NAME} api listening on port ${port}`);
});