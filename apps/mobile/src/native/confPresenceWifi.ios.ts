import type { WifiApObservation } from "@confpresence/shared";
import ConfPresenceWifi from "../../modules/conf-presence-wifi";

export async function getWifiFingerprint(): Promise<WifiApObservation[]> {
  try {
    const results = await ConfPresenceWifi.getWifiFingerprint();
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}
