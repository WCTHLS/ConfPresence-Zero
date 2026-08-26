# ConfPresence ZERO POC

Android-first proof of concept for zero-hardware conference presence tracking.

## POC outcome

Enrolled phones advertise a rotating BLE token, scan nearby ConfPresence tokens, batch compact observations to the API, and show the presenter-anchored room cluster in a live dashboard.

## Scope for the first four working days

- Android foreground BLE advertise and scan.
- Presenter and attendee roles.
- Rotating pseudonymous token (60-second epoch).
- Compact peer observations: token, RSSI, timestamp, sightings.
- API-side graph clustering and presenter-room label propagation.
- Live room-state dashboard.

Not in this POC: ultrasound, Wi-Fi fingerprinting, iOS background reliability, ML, audit-grade claims, or production security.

## Workspace

- `apps/mobile`: React Native client code and Android BLE native module source.
- `apps/api`: Node/Express API and in-memory POC inference engine.
- `packages/shared`: shared TypeScript contracts.
- `docs`: build plan, Android native integration, and test cases.

## Start order

1. Read `docs/POC_SCOPE.md`.
2. Install Java, Android Studio, Android SDK, and Node.js on the development machine.
3. Run `pnpm install` from the repository root.
4. Start the API with `pnpm --filter @confpresence/api dev`.
5. Generate the mobile native project, add the supplied Android native module, then run on two physical Android phones.

The BLE feature cannot run in an emulator or Expo Go. It needs a physical Android device and a development build containing the native module.
