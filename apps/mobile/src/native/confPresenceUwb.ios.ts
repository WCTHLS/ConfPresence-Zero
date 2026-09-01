import ConfPresenceUwb, { type UwbUpdate } from "../../modules/conf-presence-uwb";

export type { UwbUpdate };

// UWB ranging only works between two UWB-capable peers (iPhone 11+/U1 chip),
// so callers still check isUwbSupported() before relying on it.
export function isUwbPossible(): boolean {
  return true;
}

export async function isUwbSupported(): Promise<boolean> {
  try {
    return await ConfPresenceUwb.isSupported();
  } catch {
    return false;
  }
}

export async function getDiscoveryToken(): Promise<string | undefined> {
  try {
    return await ConfPresenceUwb.getDiscoveryToken();
  } catch {
    return undefined;
  }
}

export async function startRanging(rotatingId: string, peerTokenBase64: string): Promise<void> {
  await ConfPresenceUwb.startRanging(rotatingId, peerTokenBase64);
}

export async function stopRanging(rotatingId: string): Promise<void> {
  await ConfPresenceUwb.stopRanging(rotatingId);
}

export async function stopAllRanging(): Promise<void> {
  try {
    await ConfPresenceUwb.stopAllRanging();
  } catch {
    // Best-effort teardown.
  }
}

export function subscribeToUwbUpdates(callback: (update: UwbUpdate) => void) {
  return ConfPresenceUwb.addListener("ConfPresenceUwbUpdate", callback);
}
