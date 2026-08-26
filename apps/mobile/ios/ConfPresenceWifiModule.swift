import Foundation
import NetworkExtension
import SystemConfiguration.CaptiveNetwork
import React

@objc(ConfPresenceWifi)
class ConfPresenceWifiModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc func getWifiFingerprint(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 14.0, *) {
            NEHotspotNetwork.fetchCurrent { network in
                guard let network = network else {
                    resolve([])
                    return
                }
                
                let ap: [String: Any] = [
                    "bssid": network.bssid,
                    "ssid": network.ssid,
                    "rssi": Int(network.signalStrength * -100.0)
                ]
                resolve([ap])
            }
        } else {
            if let interfaces = CNCopySupportedInterfaces() as? [String] {
                var apList: [[String: Any]] = []
                for interface in interfaces {
                    if let info = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any] {
                        let ssid = info[kCNNetworkInfoKeySSID as String] as? String ?? ""
                        let bssid = info[kCNNetworkInfoKeyBSSID as String] as? String ?? ""
                        if !bssid.isEmpty {
                            apList.append([
                                "bssid": bssid,
                                "ssid": ssid,
                                "rssi": -65
                            ])
                        }
                    }
                }
                resolve(apList)
                return
            }
            resolve([])
        }
    }
}
