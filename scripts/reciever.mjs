import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = "93df5824966e01aa4b28442eb0ba7fdbee4b7d7b645b9c33";

const server = http.createServer((req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk;
    });

    req.on("end", () => {
        const timestamp = req.headers["x-webhook-timestamp"] ?? "";
        const signature = req.headers["x-webhook-signature"] ?? "";

        const expected = createHmac("sha256", secret)
            .update(timestamp + body)
            .digest("hex");

        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        const valid = a.length === b.length && timingSafeEqual(a, b);

        console.log(req.method, req.url);
        console.log("body:", body);
        console.log("signature valid:", valid);
        console.log("---");

        res.writeHead(valid ? 200 : 401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: valid }));
    });
});

server.listen(4000, () => {
    console.log("receiver listening on http://localhost:4000");
});