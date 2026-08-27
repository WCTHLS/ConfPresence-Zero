import { PermissionsAndroid, Platform } from "react-native";
import type { ParticipantRole } from "@confpresence/shared";
import { createRotatingId } from "./deviceIdentity";
import { requireBleModule, subscribeToPeers, type NativePeer } from "../native/confPresenceBle";
import { getWifiFingerprint } from "../native/confPresenceWifi";

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://confpresence-api.onrender.com";
const BATCH_INTERVAL_MS = 10_000;

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission for Presence Tracking",
          message: "ConfPresence ZERO uses Bluetooth and Wi-Fi to detect in-room presence.",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }
}

export type PresenceStatus = {
  state: "idle" | "starting" | "running" | "error";
  peerCount: number;
  wifiApCount?: number;
  rotatingId?: string;
  error?: string;
};

type StartConfig = {
  sessionId: string;
  roomId?: string;
  role: ParticipantRole;
  deviceId: string;
  displayName?: string;
  apiUrl?: string;
};

export class PresenceService {
  private peers = new Map<string, NativePeer>();
  private activePeerCache = new Map<string, { peer: NativePeer; lastSeenAt: number }>();
  private timer?: ReturnType<typeof setInterval>;
  private subscription?: { remove: () => void };
  private config?: StartConfig;
  private rotatingId?: string;
  private lastWifiApCount = 0;

  constructor(private readonly onStatus: (status: PresenceStatus) => void) {}

  async start(config: StartConfig) {
    this.config = config;
    this.lastWifiApCount = 0;
    this.peers.clear();
    this.activePeerCache.clear();
    this.onStatus({ state: "starting", peerCount: 0, wifiApCount: 0 });
    const granted = await requestBlePermissions();
    if (!granted) {
      throw new Error("Nearby devices / Bluetooth permissions are required. Please grant permissions in your phone settings.");
    }
    // Attempt join asynchronously without blocking local BLE hardware activation
    this.joinSession(config).catch(() => {
      // Offline / connecting
    });
    await this.rotateAndAdvertise();
    const ble = requireBleModule();
    this.subscription = subscribeToPeers((peer) => this.onPeer(peer));
    await ble.startScanning();
    this.timer = setInterval(() => void this.flushAndRotate(), BATCH_INTERVAL_MS);
    this.onStatus({ state: "running", peerCount: 0, wifiApCount: 0, rotatingId: this.rotatingId });
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.subscription?.remove();
    this.subscription = undefined;
    this.peers.clear();
    this.activePeerCache.clear();
    this.lastWifiApCount = 0;

    if (this.config) {
      this.leaveSession(this.config).catch(() => {});
    }

    try {
      const ble = requireBleModule();
      await Promise.all([ble.stopAdvertising(), ble.stopScanning()]);
    } catch {
      // The app may be stopping before the native module is available.
    }
    this.onStatus({ state: "idle", peerCount: 0, wifiApCount: 0 });
  }

  private cleanExpiredPeers(now: number = Date.now()) {
    // Keep peer count smooth across 30s sliding window (matching backend inference window)
    for (const [key, item] of this.activePeerCache.entries()) {
      if (now - item.lastSeenAt > 30_000) {
        this.activePeerCache.delete(key);
      }
    }
  }

  private onPeer(peer: NativePeer) {
    if (this.rotatingId && peer.rotatingId === this.rotatingId) return;
    const devicePrefix = peer.rotatingId.split("-")[0];
    if (!devicePrefix) return;

    const now = Date.now();
    this.peers.set(devicePrefix, peer);
    this.activePeerCache.set(devicePrefix, { peer, lastSeenAt: now });
    this.cleanExpiredPeers(now);

    this.onStatus({
      state: "running",
      peerCount: this.activePeerCache.size,
      wifiApCount: this.lastWifiApCount,
      rotatingId: this.rotatingId
    });
  }

  private async rotateAndAdvertise() {
    if (!this.config) return;
    this.rotatingId = createRotatingId(this.config.deviceId);
    const ble = requireBleModule();
    await ble.stopAdvertising();
    await ble.startAdvertising(this.rotatingId);
  }

  private async flushAndRotate() {
    if (!this.config || !this.rotatingId) return;
    const targetUrl = this.config.apiUrl || DEFAULT_API_URL;
    const wifiFingerprint = await getWifiFingerprint().catch(() => []);
    this.lastWifiApCount = wifiFingerprint.length;

    const body = {
      ...this.config,
      rotatingId: this.rotatingId,
      capturedAt: new Date().toISOString(),
      motionState: "unknown",
      peers: [...this.peers.values()],
      wifiFingerprint: wifiFingerprint.length > 0 ? wifiFingerprint : undefined
    };
    this.peers.clear();
    this.cleanExpiredPeers();

    try {
      await fetch(`${targetUrl}/api/observations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      await this.rotateAndAdvertise();
      this.onStatus({
        state: "running",
        peerCount: this.activePeerCache.size,
        wifiApCount: this.lastWifiApCount,
        rotatingId: this.rotatingId
      });
    } catch {
      // Keep BLE running smoothly even if temporary Wi-Fi jitter occurs
      this.onStatus({
        state: "running",
        peerCount: this.activePeerCache.size,
        wifiApCount: this.lastWifiApCount,
        rotatingId: this.rotatingId
      });
    }
  }

  private async joinSession(config: StartConfig) {
    const targetUrl = config.apiUrl || DEFAULT_API_URL;
    await fetch(`${targetUrl}/api/session/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config)
    });
  }

  private async leaveSession(config: StartConfig) {
    const targetUrl = config.apiUrl || DEFAULT_API_URL;
    await fetch(`${targetUrl}/api/session/leave`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: config.deviceId })
    });
  }
}
