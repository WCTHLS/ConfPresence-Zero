import CoreBluetooth
import Foundation
import React

@objc(ConfPresenceBle)
final class ConfPresenceBleModule: RCTEventEmitter, CBPeripheralManagerDelegate, CBCentralManagerDelegate {
    private typealias PendingPromise = (
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    )

    private let serviceUUID = CBUUID(string: "7A04")
    private var peripheralManager: CBPeripheralManager?
    private var centralManager: CBCentralManager?
    private var activeRotatingId: String?
    private var shouldScan = false
    private var isAdvertising = false
    private var hasListeners = false
    private var pendingAdvertising: PendingPromise?
    private var pendingScanning: PendingPromise?

    override static func requiresMainQueueSetup() -> Bool {
        true
    }

    override func supportedEvents() -> [String]! {
        ["ConfPresencePeerDetected"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc func startAdvertising(
        _ rotatingId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard !rotatingId.isEmpty, rotatingId.utf8.count <= 20 else {
                reject("INVALID_ROTATING_ID", "The BLE rotating ID must contain between 1 and 20 UTF-8 bytes.", nil)
                return
            }

            self.rejectAdvertising(
                code: "REQUEST_REPLACED",
                message: "A newer BLE advertising request replaced the pending request."
            )
            self.activeRotatingId = rotatingId
            self.pendingAdvertising = (resolve, reject)

            if self.peripheralManager == nil {
                self.peripheralManager = CBPeripheralManager(delegate: self, queue: .main)
            } else {
                self.handlePeripheralState()
            }
        }
    }

    @objc func stopAdvertising(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                resolve(nil)
                return
            }
            self.rejectAdvertising(code: "ADVERTISE_CANCELLED", message: "BLE advertising was stopped.")
            self.peripheralManager?.stopAdvertising()
            self.activeRotatingId = nil
            self.isAdvertising = false
            resolve(nil)
        }
    }

    @objc func startScanning(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.rejectScanning(
                code: "REQUEST_REPLACED",
                message: "A newer BLE scanning request replaced the pending request."
            )
            self.shouldScan = true
            self.pendingScanning = (resolve, reject)

            if self.centralManager == nil {
                self.centralManager = CBCentralManager(delegate: self, queue: .main)
            } else {
                self.handleCentralState()
            }
        }
    }

    @objc func stopScanning(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                resolve(nil)
                return
            }
            self.rejectScanning(code: "SCAN_CANCELLED", message: "BLE scanning was stopped.")
            self.shouldScan = false
            self.centralManager?.stopScan()
            resolve(nil)
        }
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        handlePeripheralState()
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error {
            isAdvertising = false
            rejectAdvertising(code: "ADVERTISE_FAILED", message: error.localizedDescription, error: error)
            return
        }

        isAdvertising = true
        pendingAdvertising?.resolve(nil)
        pendingAdvertising = nil
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        handleCentralState()
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
        let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data]
        let serviceToken = serviceData?[serviceUUID].flatMap {
            String(data: $0, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines.union(.controlCharacters))
        }
        guard let rotatingId = [localName, serviceToken]
            .compactMap({ $0 })
            .first(where: { !$0.isEmpty }) else {
            return
        }

        guard hasListeners else { return }
        sendEvent(
            withName: "ConfPresencePeerDetected",
            body: [
                "rotatingId": rotatingId,
                "rssi": RSSI.intValue,
                "seenAt": ISO8601DateFormatter().string(from: Date())
            ]
        )
    }

    private func handlePeripheralState() {
        guard let peripheralManager else { return }
        switch peripheralManager.state {
        case .poweredOn:
            guard let activeRotatingId else { return }
            startAdvertising(activeRotatingId, with: peripheralManager)
        case .unknown, .resetting:
            return
        case .poweredOff:
            isAdvertising = false
            rejectAdvertising(code: "BLUETOOTH_OFF", message: "Bluetooth is turned off. Turn it on in Settings and try again.")
        case .unauthorized:
            isAdvertising = false
            rejectAdvertising(code: "PERMISSION_DENIED", message: "Bluetooth permission is required. Enable it in Settings and try again.")
        case .unsupported:
            isAdvertising = false
            rejectAdvertising(code: "BLE_UNAVAILABLE", message: "BLE advertising is unavailable on this device.")
        @unknown default:
            isAdvertising = false
            rejectAdvertising(code: "BLE_UNAVAILABLE", message: "Bluetooth entered an unsupported state.")
        }
    }

    private func startAdvertising(_ rotatingId: String, with peripheralManager: CBPeripheralManager) {
        if isAdvertising || peripheralManager.isAdvertising {
            peripheralManager.stopAdvertising()
            isAdvertising = false
        }
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
            CBAdvertisementDataLocalNameKey: rotatingId
        ])
    }

    private func handleCentralState() {
        guard let centralManager else { return }
        switch centralManager.state {
        case .poweredOn:
            guard shouldScan else { return }
            if !centralManager.isScanning {
                centralManager.scanForPeripherals(
                    withServices: [serviceUUID],
                    options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
                )
            }
            pendingScanning?.resolve(nil)
            pendingScanning = nil
        case .unknown, .resetting:
            return
        case .poweredOff:
            rejectScanning(code: "BLUETOOTH_OFF", message: "Bluetooth is turned off. Turn it on in Settings and try again.")
        case .unauthorized:
            rejectScanning(code: "PERMISSION_DENIED", message: "Bluetooth permission is required. Enable it in Settings and try again.")
        case .unsupported:
            rejectScanning(code: "BLE_UNAVAILABLE", message: "BLE scanning is unavailable on this device.")
        @unknown default:
            rejectScanning(code: "BLE_UNAVAILABLE", message: "Bluetooth entered an unsupported state.")
        }
    }

    private func rejectAdvertising(code: String, message: String, error: Error? = nil) {
        pendingAdvertising?.reject(code, message, error)
        pendingAdvertising = nil
    }

    private func rejectScanning(code: String, message: String, error: Error? = nil) {
        pendingScanning?.reject(code, message, error)
        pendingScanning = nil
    }
}