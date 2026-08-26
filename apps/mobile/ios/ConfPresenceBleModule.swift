import Foundation
import CoreBluetooth
import React

@objc(ConfPresenceBle)
class ConfPresenceBleModule: RCTEventEmitter, CBPeripheralManagerDelegate, CBCentralManagerDelegate {

    private var peripheralManager: CBPeripheralManager?
    private var centralManager: CBCentralManager?
    private var isAdvertising = false
    private var isScanning = false
    private var activeRotatingId: String?
    
    private let SERVICE_UUID = CBUUID(string: "7A04")

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return ["ConfPresencePeerDetected"]
    }

    // MARK: - BLE Advertising

    @objc func startAdvertising(_ rotatingId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.activeRotatingId = rotatingId
        if peripheralManager == nil {
            peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
        }
        
        if peripheralManager?.state == .poweredOn {
            doStartAdvertising(rotatingId)
        }
        resolve(nil)
    }

    private func doStartAdvertising(_ rotatingId: String) {
        guard let peripheralManager = peripheralManager, peripheralManager.state == .poweredOn else { return }
        if isAdvertising {
            peripheralManager.stopAdvertising()
        }
        
        let advertisementData: [String: Any] = [
            CBAdvertisementDataServiceUUIDsKey: [SERVICE_UUID],
            CBAdvertisementDataLocalNameKey: rotatingId
        ]
        
        peripheralManager.startAdvertising(advertisementData)
        isAdvertising = true
    }

    @objc func stopAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if isAdvertising {
            peripheralManager?.stopAdvertising()
            isAdvertising = false
        }
        resolve(nil)
    }

    // MARK: - BLE Scanning

    @objc func startScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if centralManager == nil {
            centralManager = CBCentralManager(delegate: self, queue: nil)
        }
        
        isScanning = true
        if centralManager?.state == .poweredOn {
            centralManager?.scanForPeripherals(withServices: [SERVICE_UUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        }
        resolve(nil)
    }

    @objc func stopScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if isScanning {
            centralManager?.stopScan()
            isScanning = false
        }
        resolve(nil)
    }

    // MARK: - CBPeripheralManagerDelegate

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state == .poweredOn, let rotatingId = activeRotatingId {
            doStartAdvertising(rotatingId)
        }
    }

    // MARK: - CBCentralManagerDelegate

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn && isScanning {
            central.scanForPeripherals(withServices: [SERVICE_UUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        var token: String? = nil
        
        if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String, !localName.isEmpty {
            token = localName
        } else if let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data], let data = serviceData[SERVICE_UUID] {
            token = String(data: data, encoding: .utf8)?.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        }

        guard let peerToken = token, !peerToken.isEmpty else { return }

        let payload: [String: Any] = [
            "rotatingId": peerToken,
            "rssi": RSSI.intValue,
            "seenAt": ISO8601DateFormatter().string(from: Date())
        ]
        
        sendEvent(withName: "ConfPresencePeerDetected", body: payload)
    }
}
