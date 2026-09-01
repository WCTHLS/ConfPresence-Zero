import ExpoModulesCore
import CoreBluetooth

public class ConfPresenceBleModule: Module {
  private var peripheralManager: CBPeripheralManager?
  private var centralManager: CBCentralManager?
  private var isAdvertising = false
  private var isScanning = false
  private var activeRotatingId: String?
  private lazy var delegate = BleDelegate(module: self)

  private let serviceUUID = CBUUID(string: "7A04")

  public func definition() -> ModuleDefinition {
    Name("ConfPresenceBle")

    Events("ConfPresencePeerDetected")

    AsyncFunction("startAdvertising") { (rotatingId: String, promise: Promise) in
      self.activeRotatingId = rotatingId
      if self.peripheralManager == nil {
        self.peripheralManager = CBPeripheralManager(delegate: self.delegate, queue: nil)
      }
      if self.peripheralManager?.state == .poweredOn {
        self.doStartAdvertising(rotatingId)
      }
      promise.resolve(nil)
    }

    AsyncFunction("stopAdvertising") { (promise: Promise) in
      if self.isAdvertising {
        self.peripheralManager?.stopAdvertising()
        self.isAdvertising = false
      }
      promise.resolve(nil)
    }

    AsyncFunction("startScanning") { (promise: Promise) in
      if self.centralManager == nil {
        self.centralManager = CBCentralManager(delegate: self.delegate, queue: nil)
      }
      self.isScanning = true
      if self.centralManager?.state == .poweredOn {
        self.centralManager?.scanForPeripherals(withServices: [self.serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
      }
      promise.resolve(nil)
    }

    AsyncFunction("stopScanning") { (promise: Promise) in
      if self.isScanning {
        self.centralManager?.stopScan()
        self.isScanning = false
      }
      promise.resolve(nil)
    }
  }

  fileprivate func doStartAdvertising(_ rotatingId: String) {
    guard let peripheralManager = peripheralManager, peripheralManager.state == .poweredOn else { return }
    if isAdvertising {
      peripheralManager.stopAdvertising()
    }

    let advertisementData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataLocalNameKey: rotatingId
    ]

    peripheralManager.startAdvertising(advertisementData)
    isAdvertising = true
  }

  fileprivate func handlePeripheralPoweredOn() {
    if let rotatingId = activeRotatingId {
      doStartAdvertising(rotatingId)
    }
  }

  fileprivate func handleCentralPoweredOn() {
    if isScanning {
      centralManager?.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    }
  }

  fileprivate func handleDiscoveredPeer(advertisementData: [String: Any], rssi: NSNumber) {
    var token: String? = nil

    if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String, !localName.isEmpty {
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
    if peripheral.state == .poweredOn {
      module?.handlePeripheralPoweredOn()
    }
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state == .poweredOn {
      module?.handleCentralPoweredOn()
    }
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    module?.handleDiscoveredPeer(advertisementData: advertisementData, rssi: RSSI)
  }
}
