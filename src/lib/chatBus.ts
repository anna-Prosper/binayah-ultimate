import { EventEmitter } from "events";

// Module-scoped singleton — shared across all SSE stream connections in the same Node.js process.
// In Vercel/serverless environments, each instance has its own singleton (expected).
// For multi-instance production: upgrade to Redis pub/sub (Upstash).
export const chatBus = new EventEmitter();
chatBus.setMaxListeners(200);
