import { NativeEventEmitter, NativeModules } from "react-native";

export type NativePeer = { rotatingId: string; rssi: number; seenAt: string };

type BleNativeModule = {
  startAdvertising(rotatingId: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

const nativeModule = NativeModules.ConfPresenceBle as BleNativeModule | undefined;

export function requireBleModule(): BleNativeModule {
  if (!nativeModule) {
    throw new Error("ConfPresence BLE native module is not installed. Rebuild the app development build.");
  }
  return nativeModule;
}

export function subscribeToPeers(callback: (peer: NativePeer) => void) {
  const module = requireBleModule();
  const emitter = new NativeEventEmitter(module);
  return emitter.addListener("ConfPresencePeerDetected", callback);
}
