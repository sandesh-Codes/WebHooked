import express from "express";
import type { ErrorRequestHandler } from "express";
import { SERVICE_NAME } from "@my-project/shared";
import { healthRouter } from "./routes/health.js";
import { endpointsRouter } from "./routes/endpoints.js";
import { eventsRouter } from "./routes/events.js";

const app = express();
app.use(express.json());

const port = 3000;

app.use("/health", healthRouter)

app.use("/endpoints", endpointsRouter)

app.use("/events", eventsRouter)

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status =
    typeof err?.status === "number" && err.status >= 400 && err.status < 500
      ? err.status
      : 500;

   if (status === 500) {
    console.error("unhandled error:", err);
    res.status(500).json({ error: "internal server error" });
    return;
  }

  res.status(status).json({ error: "bad request" });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`${SERVICE_NAME} api listening on port ${port}`);
});
