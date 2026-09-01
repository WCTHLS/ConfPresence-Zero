import ExpoModulesCore
import NetworkExtension

public class ConfPresenceWifiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ConfPresenceWifi")

    AsyncFunction("getWifiFingerprint") { (promise: Promise) in
      NEHotspotNetwork.fetchCurrent { network in
        guard let network = network else {
          promise.resolve([])
          return
        }
        promise.resolve([[
          "bssid": network.bssid,
          "ssid": network.ssid,
          "rssi": Int(network.signalStrength * -100.0)
        ]])
      }
    }
  }
}
