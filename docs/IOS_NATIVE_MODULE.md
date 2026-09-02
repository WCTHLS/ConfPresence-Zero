# iOS Native Module

The iOS client uses the local `react-native-conf-presence` package. CocoaPods autolinks its Swift and Objective-C sources into the Expo-generated Xcode workspace as the `ConfPresenceNative` pod.

## Implemented Foreground Capabilities

- Advertise the current rotating ID with CoreBluetooth under service UUID `7A04`.
- Scan for nearby ConfPresence advertisements and emit `ConfPresencePeerDetected` events.
- Read the currently connected Wi-Fi access point with `NEHotspotNetwork` after Location permission is granted.
- Return actionable promise errors when Bluetooth is off, denied, or unsupported.

## Local Physical-Device Build

Requirements:

- macOS with Xcode 15 or later and CocoaPods.
- A physical iPhone running iOS 15.1 or later.
- An Apple development team and a device registered for development signing.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @confpresence/mobile prebuild:ios
cd apps/mobile/ios
pod install
open ConfPresenceZERO.xcworkspace
```

In Xcode, select the `ConfPresenceZERO` target and choose a team under **Signing & Capabilities**. Then run from Xcode or return to the repository root and use:

```bash
pnpm --filter @confpresence/mobile ios --device
```

The native modules are not available in Expo Go. A development build is required.

## EAS Build

The `development` profile targets registered physical iPhones:

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile development
```

The `development-simulator` profile is available for UI and API checks only. CoreBluetooth advertising is not representative in the simulator.

## Permissions and Entitlements

The Expo configuration supplies:

- Bluetooth usage descriptions.
- Location When In Use usage description.
- Local Network usage description.
- `com.apple.developer.networking.wifi-info` entitlement.

On first use, grant Bluetooth and Location access. Local API URLs also trigger the Local Network prompt.

## Device Identity

- The app creates one cryptographically random UUID and reuses it across process restarts and app updates.
- Signed iOS builds store the UUID in Keychain through Expo SecureStore. The same non-secret UUID is mirrored in the app-private documents directory so identity remains stable if secure storage is temporarily unavailable.
- An unprovisioned local simulator has no Keychain application identifier, so it uses the file mirror. A signed physical or EAS build uses Keychain as the primary source.

## iOS Platform Limits

- Keep the app in the foreground. JavaScript observation batching and token rotation pause when iOS suspends the app.
- Stock iOS exposes only the currently connected Wi-Fi access point. It cannot scan surrounding access points like Android.
- Wi-Fi data is optional. Presence continues with BLE when the entitlement, permission, or current network information is unavailable.
- Validate peer discovery with two physical devices. A simulator build verifies compilation and UI behavior, not BLE radio behavior.

## Troubleshooting

- `ConfPresence BLE native module is not installed`: run `pnpm install`, `pod install` from `apps/mobile/ios`, and rebuild the development client.
- `Bluetooth permission is required`: enable Bluetooth access for ConfPresence ZERO in iOS Settings.
- Wi-Fi count remains zero: confirm Location permission, the Access Wi-Fi Information capability, and that the phone is connected to Wi-Fi.
- Local API remains offline: allow Local Network access and confirm the API URL uses the computer's LAN address rather than `localhost`.