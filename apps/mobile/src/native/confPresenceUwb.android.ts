export type UwbUpdate = {
  rotatingId: string;
  distanceMeters?: number;
  direction?: { x: number; y: number; z: number };
  seenAt: string;
};

// No Android UWB implementation exists (or is broadly available on Android
// hardware today) — this stub keeps the shared call sites platform-agnostic.
export function isUwbPossible(): boolean {
  return false;
}

export async function isUwbSupported(): Promise<boolean> {
  return false;
}

export async function getDiscoveryToken(): Promise<string | undefined> {
  return undefined;
}

export async function startRanging(): Promise<void> {}

export async function stopRanging(): Promise<void> {}

export async function stopAllRanging(): Promise<void> {}

export function subscribeToUwbUpdates() {
  return { remove: () => {} };
}
