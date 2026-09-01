import { PermissionsAndroid, Platform } from "react-native";
import type { ParticipantRole, RoomMemberInfo } from "@confpresence/shared";
import { createRotatingId } from "./deviceIdentity";
import { requireBleModule, subscribeToPeers, type NativePeer } from "../native/confPresenceBle";
import { getWifiFingerprint } from "../native/confPresenceWifi";
import {
  getDiscoveryToken,
  isUwbPossible,
  startRanging,
  stopAllRanging,
  stopRanging,
  subscribeToUwbUpdates,
  type UwbUpdate
} from "../native/confPresenceUwb";

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
  uwbPeerCount?: number;
  uwbNearestDistanceMeters?: number;
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
  private isAdvertising = false;
  private lastWifiApCount = 0;
  private uwbSubscription?: { remove: () => void };
  private uwbToken?: string;
  private rangingPeerIds = new Set<string>();
  private lastUwbPeerCount = 0;
  private lastUwbNearestDistanceMeters?: number;
  // Keyed by deviceId — see the naming note in refreshUwbRanging.
  private uwbUpdates = new Map<string, UwbUpdate>();

  constructor(private readonly onStatus: (status: PresenceStatus) => void) {}

  async start(config: StartConfig) {
    this.config = config;
    this.lastWifiApCount = 0;
    this.peers.clear();
    this.activePeerCache.clear();
    this.isAdvertising = false;
    this.onStatus({ state: "starting", peerCount: 0, wifiApCount: 0 });
    const granted = await requestBlePermissions();
    if (!granted) {
      throw new Error("Nearby devices / Bluetooth permissions are required. Please grant permissions in your phone settings.");
    }
    // Attempt join asynchronously without blocking local BLE hardware activation
    this.joinSession(config).catch(() => {
      // Offline / connecting
    });
    await this.rotateAndAdvertise(true);
    const ble = requireBleModule();
    this.subscription = subscribeToPeers((peer) => this.onPeer(peer));
    await ble.startScanning();
    // Best-effort: UWB is an accuracy upgrade over BLE RSSI, not required for
    // presence to work, so failures here shouldn't block BLE from running.
    this.setupUwb().catch(() => {});
    this.timer = setInterval(() => {
      void this.flushAndRotate();
      void this.refreshUwbRanging();
    }, BATCH_INTERVAL_MS);
    this.onStatus({ state: "running", peerCount: 0, wifiApCount: 0, uwbPeerCount: 0, rotatingId: this.rotatingId });
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.subscription?.remove();
    this.subscription = undefined;
    this.uwbSubscription?.remove();
    this.uwbSubscription = undefined;
    this.peers.clear();
    this.activePeerCache.clear();
    this.isAdvertising = false;
    this.lastWifiApCount = 0;
    this.uwbToken = undefined;
    this.rangingPeerIds.clear();
    this.uwbUpdates.clear();
    this.lastUwbPeerCount = 0;
    this.lastUwbNearestDistanceMeters = undefined;
    stopAllRanging().catch(() => {});

    if (this.config) {
      this.leaveSession(this.config).catch(() => {});
    }

    try {
      const ble = requireBleModule();
      await Promise.all([ble.stopAdvertising(), ble.stopScanning()]);
    } catch {
      // The app may be stopping before the native module is available.
    }
    this.onStatus({ state: "idle", peerCount: 0, wifiApCount: 0, uwbPeerCount: 0 });
  }

  private cleanExpiredPeers(now: number = Date.now()) {
    // Keep peer count smooth across 90s sliding window
    for (const [key, item] of this.activePeerCache.entries()) {
      if (now - item.lastSeenAt > 90_000) {
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
      uwbPeerCount: this.lastUwbPeerCount,
      uwbNearestDistanceMeters: this.lastUwbNearestDistanceMeters,
      rotatingId: this.rotatingId
    });
  }

  private async rotateAndAdvertise(force = false) {
    if (!this.config) return;
    const nextToken = createRotatingId(this.config.deviceId);
    if (!force && nextToken === this.rotatingId && this.isAdvertising) {
      // Token has not changed (still in the same 60s epoch) and transmitter is running.
      return;
    }
    this.rotatingId = nextToken;
    const ble = requireBleModule();
    try {
      await ble.stopAdvertising();
    } catch {
      // Ignore stop errors
    }
    try {
      await ble.startAdvertising(this.rotatingId);
      this.isAdvertising = true;
    } catch {
      // If hardware was temporarily busy, keep state and retry on next tick
      this.isAdvertising = false;
    }
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
    } catch {
      // Keep BLE running smoothly even if temporary Wi-Fi jitter occurs
    }

    // Only restart hardware transmitter if 60s token epoch has actually changed
    await this.rotateAndAdvertise(false);

    this.onStatus({
      state: "running",
      peerCount: this.activePeerCache.size,
      wifiApCount: this.lastWifiApCount,
      uwbPeerCount: this.lastUwbPeerCount,
      uwbNearestDistanceMeters: this.lastUwbNearestDistanceMeters,
      rotatingId: this.rotatingId
    });
  }

  private async setupUwb() {
    if (!isUwbPossible()) return;
    const token = await getDiscoveryToken();
    if (!token) return;
    this.uwbToken = token;
    this.uwbSubscription = subscribeToUwbUpdates((update) => this.onUwbUpdate(update));
    await this.publishUwbToken();
  }

  private async publishUwbToken() {
    if (!this.config || !this.uwbToken) return;
    const targetUrl = this.config.apiUrl || DEFAULT_API_URL;
    await fetch(`${targetUrl}/api/uwb/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: this.config.deviceId, discoveryTokenBase64: this.uwbToken })
    }).catch(() => {
      // Best-effort; the server drops stale tokens anyway, next cycle retries.
    });
  }

  // Room members carry their current UWB token (if any) in the same live-room
  // response App.tsx already polls, so this reuses that endpoint rather than
  // adding a second polling path — see apps/api/src/inference.ts roomState().
  private async refreshUwbRanging() {
    if (!this.config || !this.uwbToken) return;
    await this.publishUwbToken();

    const targetUrl = this.config.apiUrl || DEFAULT_API_URL;
    const url =
      this.config.role === "presenter" && this.config.roomId
        ? `${targetUrl}/api/rooms/${this.config.roomId}/live?sessionId=${this.config.sessionId}`
        : `${targetUrl}/api/devices/${this.config.deviceId}/live?sessionId=${this.config.sessionId}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const members: RoomMemberInfo[] = Array.isArray(data.members) ? data.members : [];

      const seenDeviceIds = new Set<string>();
      for (const member of members) {
        if (member.deviceId === this.config.deviceId || !member.uwbDiscoveryToken) continue;
        seenDeviceIds.add(member.deviceId);
        if (!this.rangingPeerIds.has(member.deviceId)) {
          this.rangingPeerIds.add(member.deviceId);
          // The module's startRanging param is named "rotatingId" (it just
          // echoes back whatever key it's given in events), but we key
          // sessions by the stable deviceId here, not the rotating BLE token.
          startRanging(member.deviceId, member.uwbDiscoveryToken).catch(() => {
            this.rangingPeerIds.delete(member.deviceId);
          });
        }
      }

      let droppedAny = false;
      for (const deviceId of this.rangingPeerIds) {
        if (!seenDeviceIds.has(deviceId)) {
          this.rangingPeerIds.delete(deviceId);
          this.uwbUpdates.delete(deviceId);
          droppedAny = true;
          stopRanging(deviceId).catch(() => {});
        }
      }
      // A dropped peer's last-known distance would otherwise sit stale in
      // lastUwbNearestDistanceMeters forever, since no further update ever
      // arrives for it once ranging stops.
      if (droppedAny) this.recomputeNearestUwbDistance();
    } catch {
      // Best-effort; ranging toward already-connected peers keeps running.
    }
  }

  private recomputeNearestUwbDistance() {
    let nearest: number | undefined;
    for (const peerUpdate of this.uwbUpdates.values()) {
      if (peerUpdate.distanceMeters === undefined) continue;
      if (nearest === undefined || peerUpdate.distanceMeters < nearest) {
        nearest = peerUpdate.distanceMeters;
      }
    }
    this.lastUwbNearestDistanceMeters = nearest;
  }

  private onUwbUpdate(update: UwbUpdate) {
    this.uwbUpdates.set(update.rotatingId, update);
    this.lastUwbPeerCount = this.rangingPeerIds.size;
    this.recomputeNearestUwbDistance();

    this.onStatus({
      state: "running",
      peerCount: this.activePeerCache.size,
      wifiApCount: this.lastWifiApCount,
      uwbPeerCount: this.lastUwbPeerCount,
      uwbNearestDistanceMeters: this.lastUwbNearestDistanceMeters,
      rotatingId: this.rotatingId
    });
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
