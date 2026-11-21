import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const seenIds = new Set();
const maxAgeOfEventsSeconds = 300;

const secret = process.env.RECEIVER_SECRET;

if (!secret) {
  console.error("Missing RECEIVER_SECRET env var. Set it before running.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const timestamp = req.headers["x-webhook-timestamp"] ?? "";
    const signature = req.headers["x-webhook-signature"] ?? "";
    const webhookId = req.headers["x-webhook-id"] ?? "";

    const expected = createHmac("sha256", secret)
      .update(`${webhookId}.${timestamp}.${body}`)
      .digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && timingSafeEqual(a, b);

    if (!valid) {
      console.log("invalid signature, rejecting:", webhookId);
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!(ageSeconds <= maxAgeOfEventsSeconds)) {
      console.log("timestamp too old, rejecting:", webhookId);
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    if (seenIds.has(webhookId)) {
      console.log("duplicate, skipping:", webhookId);
    } else {
      seenIds.add(webhookId);
      console.log("new delivery, processing:", webhookId);
    }

    console.log(req.method, req.url);
    console.log("body:", body);
    console.log("webhook id:", webhookId);
    console.log("signature valid:", valid);
    console.log("---");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: valid }));
  });
});

server.listen(4000, () => {
  console.log("receiver listening on http://localhost:4000");
});
