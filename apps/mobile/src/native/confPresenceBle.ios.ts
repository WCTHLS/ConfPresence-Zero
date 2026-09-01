import ConfPresenceBle from "../../modules/conf-presence-ble";

export type NativePeer = { rotatingId: string; rssi: number; seenAt: string };

type BleNativeModule = {
  startAdvertising(rotatingId: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
};

export function requireBleModule(): BleNativeModule {
  return ConfPresenceBle;
}

export function subscribeToPeers(callback: (peer: NativePeer) => void) {
  return ConfPresenceBle.addListener("ConfPresencePeerDetected", callback);
}
