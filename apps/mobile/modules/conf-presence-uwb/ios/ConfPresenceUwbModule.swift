import ExpoModulesCore
import NearbyInteraction

public class ConfPresenceUwbModule: Module {
  private var sessions: [String: NISession] = [:]
  private var delegates: [String: SessionDelegate] = [:]

  public func definition() -> ModuleDefinition {
    Name("ConfPresenceUwb")

    Events("ConfPresenceUwbUpdate", "ConfPresenceUwbSessionEnded")

    AsyncFunction("isSupported") { (promise: Promise) in
      promise.resolve(NISession.isSupported)
    }

    AsyncFunction("getDiscoveryToken") { (promise: Promise) in
      guard NISession.isSupported else {
        promise.reject("UWB_UNSUPPORTED", "NearbyInteraction is not supported on this device")
        return
      }
      let session = NISession()
      guard let token = session.discoveryToken else {
        promise.reject("UWB_TOKEN_FAILED", "Could not obtain a discovery token")
        return
      }
      do {
        let data = try NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true)
        promise.resolve(data.base64EncodedString())
      } catch {
        promise.reject("UWB_TOKEN_FAILED", "Failed to encode discovery token: \(error.localizedDescription)")
      }
    }

    AsyncFunction("startRanging") { (rotatingId: String, peerTokenBase64: String, promise: Promise) in
      guard NISession.isSupported else {
        promise.reject("UWB_UNSUPPORTED", "NearbyInteraction is not supported on this device")
        return
      }
      guard let data = Data(base64Encoded: peerTokenBase64),
            let peerToken = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NIDiscoveryToken.self, from: data) else {
        promise.reject("UWB_TOKEN_INVALID", "Could not decode peer discovery token")
        return
      }

      self.stopSession(for: rotatingId)

      let session = NISession()
      let delegate = SessionDelegate(rotatingId: rotatingId, module: self)
      session.delegate = delegate
      self.delegates[rotatingId] = delegate
      self.sessions[rotatingId] = session

      session.run(NINearbyPeerConfiguration(peerToken: peerToken))
      promise.resolve(nil)
    }

    AsyncFunction("stopRanging") { (rotatingId: String, promise: Promise) in
      self.stopSession(for: rotatingId)
      promise.resolve(nil)
    }

    AsyncFunction("stopAllRanging") { (promise: Promise) in
      for rotatingId in self.sessions.keys {
        self.stopSession(for: rotatingId)
      }
      promise.resolve(nil)
    }
  }

  private func stopSession(for rotatingId: String) {
    sessions[rotatingId]?.invalidate()
    sessions.removeValue(forKey: rotatingId)
    delegates.removeValue(forKey: rotatingId)
  }

  fileprivate func emitUpdate(rotatingId: String, object: NINearbyObject) {
    var payload: [String: Any] = [
      "rotatingId": rotatingId,
      "seenAt": ISO8601DateFormatter().string(from: Date())
    ]
    if let distance = object.distance {
      payload["distanceMeters"] = distance
    }
    if let direction = object.direction {
      payload["direction"] = ["x": direction.x, "y": direction.y, "z": direction.z]
    }
    sendEvent("ConfPresenceUwbUpdate", payload)
  }

  fileprivate func emitSessionEnded(rotatingId: String, reason: String) {
    sendEvent("ConfPresenceUwbSessionEnded", ["rotatingId": rotatingId, "reason": reason])
    stopSession(for: rotatingId)
  }
}

private class SessionDelegate: NSObject, NISessionDelegate {
  let rotatingId: String
  weak var module: ConfPresenceUwbModule?

  init(rotatingId: String, module: ConfPresenceUwbModule) {
    self.rotatingId = rotatingId
    self.module = module
  }

  func session(_ session: NISession, didUpdate nearbyObjects: [NINearbyObject]) {
    guard let object = nearbyObjects.first else { return }
    module?.emitUpdate(rotatingId: rotatingId, object: object)
  }

  func session(_ session: NISession, didRemove nearbyObjects: [NINearbyObject], reason: NINearbyObject.RemovalReason) {
    module?.emitSessionEnded(rotatingId: rotatingId, reason: "\(reason)")
  }

  func session(_ session: NISession, didInvalidateWith error: Error) {
    module?.emitSessionEnded(rotatingId: rotatingId, reason: error.localizedDescription)
  }

  func sessionWasSuspended(_ session: NISession) {}
  func sessionSuspensionEnded(_ session: NISession) {}
}
