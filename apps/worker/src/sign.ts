import { createHmac } from "node:crypto";

export function signPayload(secret: string, id: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("hex");
}