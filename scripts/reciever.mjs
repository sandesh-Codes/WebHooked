import http from "node:http";

const server = http.createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    console.log(req.method, req.url);
    console.log("timestamp header:", req.headers["x-webhook-timestamp"]);
    console.log("signature header:", req.headers["x-webhook-signature"]);
    console.log("body:", body);
    console.log("---");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });
});

server.listen(4000, () => {
  console.log("receiver listening on http://localhost:4000");
});