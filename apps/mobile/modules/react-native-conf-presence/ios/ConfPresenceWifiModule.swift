import CoreLocation
import Foundation
import NetworkExtension
import React
import SystemConfiguration.CaptiveNetwork

@objc(ConfPresenceWifi)
final class ConfPresenceWifiModule: NSObject, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var pendingResolve: RCTPromiseResolveBlock?

    @objc static func requiresMainQueueSetup() -> Bool {
        true
    }

    @objc func getWifiFingerprint(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                resolve([])
                return
            }
            guard self.pendingResolve == nil else {
                resolve([])
                return
            }

            self.pendingResolve = resolve
            let manager = self.locationManager ?? CLLocationManager()
            self.locationManager = manager
            manager.delegate = self

            switch manager.authorizationStatus {
            case .authorizedAlways, .authorizedWhenInUse:
                self.fetchCurrentNetwork()
            case .notDetermined:
                manager.requestWhenInUseAuthorization()
            case .denied, .restricted:
                self.finish(with: [])
            @unknown default:
                self.finish(with: [])
            }
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        handleAuthorization(manager.authorizationStatus)
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        handleAuthorization(status)
    }

    private func handleAuthorization(_ status: CLAuthorizationStatus) {
        guard pendingResolve != nil else { return }
        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            fetchCurrentNetwork()
        case .denied, .restricted:
            finish(with: [])
        case .notDetermined:
            return
        @unknown default:
            finish(with: [])
        }
    }

    private func fetchCurrentNetwork() {
        if #available(iOS 14.0, *) {
            NEHotspotNetwork.fetchCurrent { [weak self] network in
                DispatchQueue.main.async {
                    guard let network else {
                        self?.finish(with: [])
                        return
                    }
                    let rssi = Int((-100.0 + network.signalStrength * 70.0).rounded())
                    self?.finish(with: [[
                        "bssid": network.bssid,
                        "ssid": network.ssid,
                        "rssi": rssi
                    ]])
                }
            }
            return
        }

        guard let interfaces = CNCopySupportedInterfaces() as? [String] else {
            finish(with: [])
            return
        }
        let accessPoints = interfaces.compactMap { interface -> [String: Any]? in
            guard let info = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any],
                  let bssid = info[kCNNetworkInfoKeyBSSID as String] as? String,
                  !bssid.isEmpty else {
                return nil
            }
            return [
                "bssid": bssid,
                "ssid": info[kCNNetworkInfoKeySSID as String] as? String ?? "",
                "rssi": -65
            ]
        }
        finish(with: accessPoints)
    }

    private func finish(with accessPoints: [[String: Any]]) {
        pendingResolve?(accessPoints)
        pendingResolve = nil
    }
}