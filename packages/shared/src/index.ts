export type ParticipantRole = "presenter" | "attendee";

export interface PeerObservation {
  rotatingId: string;
  rssi: number;
  seenAt: string;
}

export interface WifiApObservation {
  bssid: string;
  ssid?: string;
  rssi: number;
  frequency?: number;
}

export interface PresenceBatch {
  sessionId: string;
  deviceId: string;
  displayName?: string;
  rotatingId: string;
  role: ParticipantRole;
  roomId?: string;
  capturedAt: string;
  peers: PeerObservation[];
  wifiFingerprint?: WifiApObservation[];
  motionState?: "moving" | "still" | "unknown";
}

export interface JoinSessionRequest {
  sessionId: string;
  deviceId: string;
  displayName?: string;
  role: ParticipantRole;
  roomId?: string;
}

export interface UwbTokenRequest {
  deviceId: string;
  discoveryTokenBase64: string;
}

export interface RoomMemberInfo {
  deviceId: string;
  displayName: string;
  role: ParticipantRole;
  confidence?: number;
  wifiSimilarity?: number;
  uwbDiscoveryToken?: string;
}

export interface LiveRoomState {
  sessionId: string;
  roomId: string;
  presenterDeviceId?: string;
  presenterName?: string;
  estimatedMemberDeviceIds: string[];
  members?: RoomMemberInfo[];
  updatedAt: string;
}
