import cors from "cors";
import express from "express";
import { z } from "zod";
import { PocInferenceEngine } from "./inference.js";

const app = express();
const engine = new PocInferenceEngine();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "256kb" }));

const joinSchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().min(8),
  displayName: z.string().optional(),
  role: z.enum(["presenter", "attendee"]),
  roomId: z.string().min(1).optional()
});

const leaveSchema = z.object({
  deviceId: z.string().min(8)
});

const wifiApSchema = z.object({
  bssid: z.string().min(1),
  ssid: z.string().optional(),
  rssi: z.number().min(-127).max(20),
  frequency: z.number().optional()
});

const batchSchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().min(8),
  displayName: z.string().optional(),
  rotatingId: z.string().min(8),
  role: z.enum(["presenter", "attendee"]),
  roomId: z.string().min(1).optional(),
  capturedAt: z.string().datetime(),
  motionState: z.enum(["moving", "still", "unknown"]).optional(),
  peers: z.array(z.object({
    rotatingId: z.string().min(8),
    rssi: z.number().min(-127).max(20),
    seenAt: z.string().datetime()
  })).max(100),
  wifiFingerprint: z.array(wifiApSchema).max(50).optional()
});

app.get("/health", (_request, response) => response.json({ ok: true }));
app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.post("/api/session/join", (request, response) => {
  const parsed = joinSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  engine.join(parsed.data.deviceId, parsed.data.role, parsed.data.roomId, parsed.data.displayName);
  return response.status(201).json({ ok: true });
});

app.post("/api/session/leave", (request, response) => {
  const parsed = leaveSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  engine.leave(parsed.data.deviceId);
  return response.json({ ok: true });
});

app.post("/api/observations", (request, response) => {
  const parsed = batchSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  engine.ingest(parsed.data);
  return response.status(202).json({ ok: true, peerCount: parsed.data.peers.length });
});

app.get("/api/rooms", (request, response) => {
  const sessionId = String(request.query.sessionId ?? "poc-session");
  return response.json({ rooms: engine.listRooms(sessionId) });
});

app.get("/api/rooms/:roomId/live", (request, response) => {
  const sessionId = String(request.query.sessionId ?? "poc-session");
  return response.json(engine.roomState(sessionId, request.params.roomId));
});

app.get("/api/devices/:deviceId/live", (request, response) => {
  const sessionId = String(request.query.sessionId ?? "poc-session");
  return response.json(engine.deviceRoomState(sessionId, request.params.deviceId));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`ConfPresence POC API listening on http://0.0.0.0:${port}`);
});
