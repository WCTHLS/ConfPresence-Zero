import ExpoModulesCore
import CoreBluetooth

public class ConfPresenceBleModule: Module {
  private var peripheralManager: CBPeripheralManager?
  private var centralManager: CBCentralManager?
  private var isAdvertising = false
  private var isScanning = false
  private var activeRotatingId: String?
  private lazy var delegate = BleDelegate(module: self)

  // Held only while a JS call is waiting on a result; state-driven retries
  // (e.g. Bluetooth toggled back on with no pending JS call) leave these nil
  // and just fall through to resuming advertising/scanning silently.
  private var pendingAdvertisePromise: Promise?
  private var pendingScanPromise: Promise?

  private let serviceUUID = CBUUID(string: "7A04")

  public func definition() -> ModuleDefinition {
    Name("ConfPresenceBle")

    Events("ConfPresencePeerDetected")

    AsyncFunction("startAdvertising") { (rotatingId: String, promise: Promise) in
      self.activeRotatingId = rotatingId
      if self.peripheralManager == nil {
        self.peripheralManager = CBPeripheralManager(delegate: self.delegate, queue: nil)
      }
      self.pendingAdvertisePromise = promise
      self.attemptStartAdvertising()
    }

    AsyncFunction("stopAdvertising") { (promise: Promise) in
      if self.isAdvertising {
        self.peripheralManager?.stopAdvertising()
        self.isAdvertising = false
      }
      self.pendingAdvertisePromise = nil
      promise.resolve(nil)
    }

    AsyncFunction("startScanning") { (promise: Promise) in
      if self.centralManager == nil {
        self.centralManager = CBCentralManager(delegate: self.delegate, queue: nil)
      }
      self.isScanning = true
      self.pendingScanPromise = promise
      self.attemptStartScanning()
    }

    AsyncFunction("stopScanning") { (promise: Promise) in
      if self.isScanning {
        self.centralManager?.stopScan()
        self.isScanning = false
      }
      self.pendingScanPromise = nil
      promise.resolve(nil)
    }
  }

  // MARK: - Advertising

  fileprivate func attemptStartAdvertising() {
    guard let peripheralManager = peripheralManager else { return }
    if let promise = pendingAdvertisePromise, rejectForState(peripheralManager.state, promise) {
      pendingAdvertisePromise = nil
      return
    }
    guard peripheralManager.state == .poweredOn, let rotatingId = activeRotatingId else { return }
    doStartAdvertising(rotatingId)
    // pendingAdvertisePromise (if any) resolves from peripheralManagerDidStartAdvertising below.
  }

  private func doStartAdvertising(_ rotatingId: String) {
    guard let peripheralManager = peripheralManager, peripheralManager.state == .poweredOn else { return }
    if isAdvertising {
      peripheralManager.stopAdvertising()
    }

    let advertisementData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataLocalNameKey: rotatingId
    ]

    peripheralManager.startAdvertising(advertisementData)
  }

  fileprivate func handleAdvertisingStarted(error: Error?) {
    isAdvertising = error == nil
    guard let promise = pendingAdvertisePromise else { return }
    pendingAdvertisePromise = nil
    if let error = error {
      promise.reject("ADVERTISE_FAILED", "Failed to start BLE advertising: \(error.localizedDescription)")
    } else {
      promise.resolve(nil)
    }
  }

  // MARK: - Scanning

  fileprivate func attemptStartScanning() {
    guard let centralManager = centralManager else { return }
    if let promise = pendingScanPromise, rejectForState(centralManager.state, promise) {
      pendingScanPromise = nil
      isScanning = false
      return
    }
    guard centralManager.state == .poweredOn, isScanning else { return }
    centralManager.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    // CoreBluetooth has no async confirmation for scan start, unlike advertising —
    // resolve immediately once the call has actually been issued.
    if let promise = pendingScanPromise {
      pendingScanPromise = nil
      promise.resolve(nil)
    }
  }

  // MARK: - Shared CBManagerState handling

  /// Returns true (and rejects) for states that can't recover on their own —
  /// permission denied, no BLE hardware, or Bluetooth off. Returns false for
  /// .poweredOn (caller should proceed) and .unknown/.resetting (caller
  /// should keep waiting for the next state update).
  private func rejectForState(_ state: CBManagerState, _ promise: Promise) -> Bool {
    switch state {
    case .poweredOn, .resetting, .unknown:
      return false
    case .unauthorized:
      promise.reject("PERMISSION_DENIED", "Nearby devices / Bluetooth permission is required. Please grant permission in Settings.")
      return true
    case .unsupported:
      promise.reject("BLE_UNAVAILABLE", "Bluetooth Low Energy is unavailable on this device.")
      return true
    case .poweredOff:
      promise.reject("BLUETOOTH_OFF", "Bluetooth is turned off. Please turn on Bluetooth in Settings.")
      return true
    @unknown default:
      return false
    }
  }

  fileprivate func handlePeripheralStateChanged() {
    attemptStartAdvertising()
  }

  fileprivate func handleCentralStateChanged() {
    attemptStartScanning()
  }

  fileprivate func handleDiscoveredPeer(advertisementData: [String: Any], rssi: NSNumber) {
    var token: String? = nil

    // Local Name is where iOS peers put their token (CBPeripheralManager can't
    // set Service Data on outgoing advertisements) — require the rotating-
    // token format ("-" separated) so a random nearby device's own name
    // (headphones, someone's "iPhone") isn't misread as a sighting.
    if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String,
       !localName.isEmpty, localName.contains("-") {
      token = localName
    } else if let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data], let data = serviceData[serviceUUID] {
      token = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    guard let peerToken = token, !peerToken.isEmpty else { return }

    sendEvent("ConfPresencePeerDetected", [
      "rotatingId": peerToken,
      "rssi": rssi.intValue,
      "seenAt": ISO8601DateFormatter().string(from: Date())
    ])
  }
}

private class BleDelegate: NSObject, CBPeripheralManagerDelegate, CBCentralManagerDelegate {
  weak var module: ConfPresenceBleModule?

  init(module: ConfPresenceBleModule) {
    self.module = module
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    module?.handlePeripheralStateChanged()
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    module?.handleAdvertisingStarted(error: error)
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    module?.handleCentralStateChanged()
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    module?.handleDiscoveredPeer(advertisementData: advertisementData, rssi: RSSI)
  }
}
