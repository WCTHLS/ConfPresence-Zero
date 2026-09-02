import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "confpresence.device-id.v1";
const DEVICE_ID_PATTERN = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE_ID_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}confpresence-device-id-v1`
  : undefined;
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.thaqib.confpresencezeropoc.device-identity"
};

let cachedId: string | undefined;
let pendingId: Promise<string> | undefined;

function createDeviceId(): string {
  return `${Platform.OS}-${Crypto.randomUUID()}`;
}

function validStoredId(value: string | null): string | undefined {
  const candidate = value?.trim();
  return candidate && DEVICE_ID_PATTERN.test(candidate) ? candidate : undefined;
}

async function readSecureId(): Promise<string | undefined> {
  try {
    return validStoredId(await SecureStore.getItemAsync(DEVICE_ID_KEY, STORE_OPTIONS));
  } catch {
    return undefined;
  }
}

async function readFallbackId(): Promise<string | undefined> {
  if (!DEVICE_ID_FILE_URI) return undefined;

  try {
    return validStoredId(await FileSystem.readAsStringAsync(DEVICE_ID_FILE_URI));
  } catch {
    return undefined;
  }
}

async function persistSecureId(deviceId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId, STORE_OPTIONS);
  } catch {
    // SecureStore requires signing entitlements that may be absent in local simulators.
  }
}

async function persistFallbackId(deviceId: string): Promise<void> {
  if (!DEVICE_ID_FILE_URI) return;

  try {
    await FileSystem.writeAsStringAsync(DEVICE_ID_FILE_URI, deviceId);
  } catch {
    // The in-memory cache remains a last resort if both persistent stores are unavailable.
  }
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  if (pendingId) return pendingId;

  pendingId = (async () => {
    try {
      const storedId = (await readSecureId()) ?? (await readFallbackId());
      if (storedId) {
        await Promise.all([persistSecureId(storedId), persistFallbackId(storedId)]);
        cachedId = storedId;
        return storedId;
      }

      const deviceId = createDeviceId();
      await Promise.all([persistSecureId(deviceId), persistFallbackId(deviceId)]);
      cachedId = deviceId;
      return deviceId;
    } finally {
      pendingId = undefined;
    }
  })();

  return pendingId;
}

export function createRotatingId(deviceId: string, epochMs = 60_000): string {
  const epoch = Math.floor(Date.now() / epochMs);
  const prefix = deviceId.slice(-8).padStart(8, "0");
  const epochStr = epoch.toString(36).slice(-6).padStart(6, "0");
  return `${prefix}-${epochStr}`;
}
