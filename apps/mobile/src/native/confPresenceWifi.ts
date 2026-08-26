import { NativeModules, Platform } from "react-native";
import type { WifiApObservation } from "@confpresence/shared";

type WifiNativeModule = {
  getWifiFingerprint(): Promise<WifiApObservation[]>;
};

const nativeModule = NativeModules.ConfPresenceWifi as WifiNativeModule | undefined;

export async function getWifiFingerprint(): Promise<WifiApObservation[]> {
  if ((Platform.OS !== "android" && Platform.OS !== "ios") || !nativeModule) {
    return [];
  }
  try {
    const results = await nativeModule.getWifiFingerprint();
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}
