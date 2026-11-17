import { createHmac } from "node:crypto";

export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(timestamp + body)
    .digest("hex");
}