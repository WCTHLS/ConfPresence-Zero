import { Platform } from "react-native";

let cachedId: string | undefined;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  // POC only. Replace this with a securely stored random identifier before any wider test.
  cachedId = `${Platform.OS}-${Math.random().toString(36).slice(2, 12)}`;
  return cachedId;
}

export function createRotatingId(deviceId: string, epochMs = 60_000): string {
  const epoch = Math.floor(Date.now() / epochMs);
  const prefix = deviceId.slice(-8).padStart(8, "0");
  const epochStr = epoch.toString(36).slice(-6).padStart(6, "0");
  return `${prefix}-${epochStr}`;
}
