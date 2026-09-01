import type { LiveRoomState, PresenceBatch, RoomMemberInfo, WifiApObservation } from "@confpresence/shared";

const WINDOW_MS = 30_000; // 30 seconds sliding active window
const MIN_RSSI = -85;     // 20+ meters coverage in open line-of-sight halls

type DeviceRecord = {
  deviceId: string;
  displayName?: string;
  role: "presenter" | "attendee";
  roomId?: string;
  rotatingId?: string;
  wifiFingerprint?: WifiApObservation[];
  updatedAt: number;
};

export class PocInferenceEngine {
  private readonly devices = new Map<string, DeviceRecord>();
  private readonly batches: PresenceBatch[] = [];

  join(deviceId: string, role: "presenter" | "attendee", roomId?: string, displayName?: string) {
    const current = this.devices.get(deviceId);
    this.devices.set(deviceId, {
      deviceId,
      displayName: displayName || current?.displayName || undefined,
      role,
      roomId,
      wifiFingerprint: current?.wifiFingerprint,
      updatedAt: Date.now()
    });
  }

  leave(deviceId: string) {
    this.devices.delete(deviceId);
    // Purge batches associated with this device
    for (let i = this.batches.length - 1; i >= 0; i--) {
      if (this.batches[i].deviceId === deviceId) {
        this.batches.splice(i, 1);
      }
    }
  }

  ingest(batch: PresenceBatch) {
    const current = this.devices.get(batch.deviceId);
    this.devices.set(batch.deviceId, {
      deviceId: batch.deviceId,
      displayName: batch.displayName || current?.displayName,
      role: batch.role,
      roomId: batch.roomId ?? current?.roomId,
      rotatingId: batch.rotatingId,
      wifiFingerprint: batch.wifiFingerprint && batch.wifiFingerprint.length > 0
        ? batch.wifiFingerprint
        : current?.wifiFingerprint,
      updatedAt: Date.now()
    });
    this.batches.push(batch);
    this.trim();
  }

  roomState(sessionId: string, roomId: string): LiveRoomState {
    this.trim();
    const now = Date.now();
    const presenters = [...this.devices.values()]
      .filter((device) => device.role === "presenter" && device.roomId === roomId && now - device.updatedAt < WINDOW_MS * 2)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const presenter = presenters[0];

    if (!presenter) {
      return {
        sessionId,
        roomId,
        estimatedMemberDeviceIds: [],
        members: [],
        updatedAt: new Date().toISOString()
      };
    }

    const graph = this.buildGraph();
    const members = this.componentFrom(presenter.deviceId, graph);

    const membersInfo: RoomMemberInfo[] = [...members].map((id) => {
      const rec = this.devices.get(id);
      const isPresenter = id === presenter.deviceId;
      
      let wifiSimilarity: number | undefined;
      let confidence = isPresenter ? 1.0 : 0.85;

      if (!isPresenter && presenter.wifiFingerprint?.length && rec?.wifiFingerprint?.length) {
        const sim = this.computeWifiCosineSimilarity(rec.wifiFingerprint, presenter.wifiFingerprint);
        if (sim !== undefined) {
          wifiSimilarity = Number(sim.toFixed(2));
          // Dual-sensor confidence fusion:
          // In-room Wi-Fi match (>= 0.70) boosts attendee confidence up to 0.98.
          if (sim >= 0.70) {
            confidence = Number(Math.min(0.98, 0.85 + (sim - 0.70) * 0.43).toFixed(2));
          } else {
            confidence = Number(Math.max(0.70, 0.85 - (0.70 - sim) * 0.30).toFixed(2));
          }
        }
      }

      return {
        deviceId: id,
        displayName: rec?.displayName || id,
        role: rec?.role || (isPresenter ? "presenter" : "attendee"),
        confidence,
        wifiSimilarity
      };
    });

    return {
      sessionId,
      roomId,
      presenterDeviceId: presenter.deviceId,
      presenterName: presenter.displayName || presenter.deviceId,
      estimatedMemberDeviceIds: [...members],
      members: membersInfo,
      updatedAt: new Date().toISOString()
    };
  }

  deviceRoomState(sessionId: string, deviceId: string): LiveRoomState {
    this.trim();
    const graph = this.buildGraph();
    const now = Date.now();

    // Check if the querying device is itself an active presenter
    const currentDevice = this.devices.get(deviceId);
    if (currentDevice?.role === "presenter" && currentDevice.roomId) {
      return this.roomState(sessionId, currentDevice.roomId);
    }

    // For Attendees: Find which active presenter's room cluster contains this device
    const activePresenters = [...this.devices.values()]
      .filter((d) => d.role === "presenter" && d.roomId && now - d.updatedAt < WINDOW_MS * 2)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    for (const presenter of activePresenters) {
      const members = this.componentFrom(presenter.deviceId, graph);
      if (members.has(deviceId)) {
        return this.roomState(sessionId, presenter.roomId!);
      }
    }

    // Attendee is not in any active presenter room cluster -> return clean empty/unassigned state
    return {
      sessionId,
      roomId: "unknown",
      estimatedMemberDeviceIds: [],
      members: [],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Computes the calibrated indoor similarity (0.0 to 1.0) between two Wi-Fi AP fingerprints.
   * 1. Filters out fluctuating noise APs (< -85 dBm).
   * 2. Extracts top dominant access points from each device.
   * 3. Calculates BSSID set overlap + signal proximity delta for in-room tolerance (2m-10m).
   */
  computeWifiCosineSimilarity(fpA: WifiApObservation[], fpB: WifiApObservation[]): number | undefined {
    if (!fpA.length || !fpB.length) return undefined;

    // Filter out faint noise APs below -85 dBm and take the top 12 strongest APs from each device
    const validA = fpA
      .filter((ap) => ap.rssi >= -85)
      .sort((a, b) => b.rssi - a.rssi)
      .slice(0, 12);
    const validB = fpB
      .filter((ap) => ap.rssi >= -85)
      .sort((a, b) => b.rssi - a.rssi)
      .slice(0, 12);

    if (!validA.length || !validB.length) return undefined;

    const mapA = new Map<string, number>();
    for (const ap of validA) {
      const bssid = ap.bssid.toLowerCase().trim();
      mapA.set(bssid, Math.max(mapA.get(bssid) ?? -100, ap.rssi));
    }

    const mapB = new Map<string, number>();
    for (const ap of validB) {
      const bssid = ap.bssid.toLowerCase().trim();
      mapB.set(bssid, Math.max(mapB.get(bssid) ?? -100, ap.rssi));
    }

    let sharedCount = 0;
    let totalSignalSim = 0;

    for (const [bssid, rssiA] of mapA) {
      const rssiB = mapB.get(bssid);
      if (rssiB !== undefined) {
        sharedCount++;
        // Delta tolerance: 0 dBm diff -> 1.0, 15 dBm diff -> 0.67, 30 dBm diff -> 0.33, 45 dBm -> 0.0
        const delta = Math.abs(rssiA - rssiB);
        const signalSim = Math.max(0, 1 - delta / 45);
        totalSignalSim += signalSim;
      }
    }

    if (sharedCount === 0) return 0;

    // 1. Overlap score (fraction of dominant APs heard by both phones)
    const overlapRatio = (sharedCount * 2) / (mapA.size + mapB.size); // Dice-Sørensen coefficient

    // 2. Average signal proximity across all shared APs
    const avgSignalSim = totalSignalSim / sharedCount;

    // 3. Calibrated in-room blend: 40% Overlap + 60% Signal Proximity
    const rawMatch = 0.40 * overlapRatio + 0.60 * avgSignalSim;

    // Scale to intuitive in-room bounds:
    // If in the same room (sharedCount >= 3 and overlapRatio >= 0.4), scale smoothly between 0.75 and 0.95
    if (sharedCount >= 3 && overlapRatio >= 0.4) {
      return Number(Math.min(0.96, Math.max(0.72, 0.65 + rawMatch * 0.32)).toFixed(2));
    }

    return Number(Math.min(0.65, rawMatch * 0.75).toFixed(2));
  }

  listRooms(sessionId: string): string[] {
    this.trim();
    const rooms = new Set<string>(["room-a", "room-b"]);
    for (const d of this.devices.values()) {
      if (d.roomId) rooms.add(d.roomId);
    }
    return [...rooms];
  }

  private buildGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    const tokenToDevice = new Map<string, string>();
    for (const device of this.devices.values()) {
      if (device.rotatingId) tokenToDevice.set(device.rotatingId, device.deviceId);
    }

    const resolveDeviceId = (token: string): string | undefined => {
      const direct = tokenToDevice.get(token);
      if (direct) return direct;
      const cleanToken = token.trim();
      const prefix = cleanToken.split("-")[0];
      if (prefix && prefix.length >= 4) {
        for (const device of this.devices.values()) {
          const deviceClean = device.deviceId.toLowerCase();
          const prefixClean = prefix.toLowerCase();
          if (deviceClean.endsWith(prefixClean) || deviceClean.includes(prefixClean)) {
            return device.deviceId;
          }
        }
      }
      return undefined;
    };

    const sightings = new Map<string, { count: number; maxRssi: number }>();

    for (const batch of this.batches) {
      for (const peer of batch.peers) {
        if (peer.rssi < MIN_RSSI) continue;
        const peerDeviceId = resolveDeviceId(peer.rotatingId);
        if (!peerDeviceId || peerDeviceId === batch.deviceId) continue;

        const key = [batch.deviceId, peerDeviceId].sort().join("|");
        const current = sightings.get(key) ?? { count: 0, maxRssi: -999 };
        current.count += 1;
        current.maxRssi = Math.max(current.maxRssi, peer.rssi);
        sightings.set(key, current);
      }
    }

    for (const [key, data] of sightings) {
      const [left, right] = key.split("|");
      if (data.count >= 1) {
        if (!graph.has(left)) graph.set(left, new Set());
        if (!graph.has(right)) graph.set(right, new Set());
        graph.get(left)?.add(right);
        graph.get(right)?.add(left);
      }
    }
    return graph;
  }

  private componentFrom(start: string, graph: Map<string, Set<string>>): Set<string> {
    const visited = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return visited;
  }

  private trim() {
    const cutoff = Date.now() - WINDOW_MS;
    while (this.batches.length && new Date(this.batches[0].capturedAt).getTime() < cutoff) {
      this.batches.shift();
    }
    const staleDeviceCutoff = Date.now() - WINDOW_MS * 3;
    for (const [id, record] of this.devices.entries()) {
      if (record.updatedAt < staleDeviceCutoff) {
        this.devices.delete(id);
      }
    }
  }
}
