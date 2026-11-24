import { SERVICE_NAME } from "@my-project/shared";
import { Router } from "express";
import { pool } from "../db.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

healthRouter.get("/db", async (_req, res) => {
  const result = await pool.query("SELECT 1 AS ok");
  res.json({ db: result.rows[0] });
});