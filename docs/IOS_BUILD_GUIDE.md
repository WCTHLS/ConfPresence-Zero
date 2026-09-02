# iOS Build Guide

How to build ConfPresence ZERO for a real iPhone using EAS Build, and install it
on a physical device. This is written for whoever has a **paid Apple Developer
Program membership** and wants to produce an installable build without needing
a Mac themselves — EAS Build compiles it on Apple's cloud infrastructure.

> **Branch note:** iOS support (BLE, Wi-Fi, and UWB precise ranging) lives on
> `feature/ios-native-module-local-modules`, not yet merged into `main`.

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Node.js v20+ | Same as the rest of this repo. |
| pnpm v10+ | `npm install -g pnpm` |
| An Expo/EAS account | Free — create one at [expo.dev](https://expo.dev) if you don't have one. Separate from your Apple ID. |
| **A paid Apple Developer Program membership** | $99/year, tied to your Apple ID; without it, EAS cannot generate the signing certificate needed to install on a physical device. |
| `eas-cli` | `npm install -g eas-cli` |

You do **not** need Xcode, a Mac, or CocoaPods installed locally — the build
itself runs on Apple hardware in EAS's cloud, not on your machine.

---

## 2. Get the code

```bash
git clone https://github.com/WCTHLS/ConfPresence-Zero.git
cd ConfPresence-Zero
git checkout feature/ios-native-module-local-modules
pnpm install
```

---

## 3. Log into EAS

```bash
eas login
```

Use your Expo account credentials (not your Apple ID — that comes later,
during the build itself).

Run `eas whoami` afterward to confirm which account you're logged in as.

---

## 4. Link your own EAS project

`apps/mobile/app.json` has a `projectId` that determines which EAS project
(and whose build history/quota) this build counts against. It's currently
set to a project under Thaqib's personal Expo account (not a paid team
account) — you won't have access to it, and it can't do ad-hoc `preview`
builds anyway without a paid Apple Developer membership behind it.

Run this from `apps/mobile/` to link a fresh project under your own EAS
account instead:

```bash
cd apps/mobile
eas init
```

This edits `app.json` locally to point at your own project. **Don't commit
that change** — it would silently redirect the project's shared build
config to your personal project if pushed. Once you're done building, either
discard the change (`git checkout -- app.json`) or leave it uncommitted.


---

## 5. Register your iPhone

EAS Build's `preview` profile produces an ad-hoc build, which only installs
on devices explicitly registered to your Apple Developer account.

```bash
cd apps/mobile
eas device:create
```

This prints a registration link (and QR code) — open it **on the iPhone**
you intend to install the build on. It captures the device's UDID and
registers it. Do this before building, since the provisioning profile is
generated with the registered device list baked in.

---

## 6. Build

```bash
eas build --platform ios --profile preview
```

Run this interactively (not in a CI/non-interactive context) the first time —
EAS will prompt you to log into your Apple ID and offer to generate a new
distribution certificate and provisioning profile automatically. Accept the
default prompts unless you already manage your own signing credentials.

The build runs remotely and typically takes 10–15 minutes. You'll get a link
to watch progress, and a final message with an install link + QR code once
it finishes.

`preview` (rather than `development`) is deliberate here — it produces a
standalone binary that doesn't need a Metro/dev-server connection to run,
unlike a `development` build.

---

## 7. Install

Open the link from the build output (or scan the QR code) **on the
registered iPhone**, and follow the install prompt.

---

## 8. What to expect

- **BLE presence detection** — should work fully, cross-platform with
  Android.
- **UWB precise ranging** — only activates between **two** UWB-capable
  iPhones (iPhone 11 or later, U1/U2 chip) both running this build
  simultaneously. With only one such device in a test, you won't see any
  ranging data — that's expected, not a bug.
- **Wi-Fi fingerprinting** — likely returns empty on iOS regardless of
  device. This is a known, separate limitation (Apple gates real Wi-Fi
  network data behind an additional entitlement this project doesn't
  currently request) — not something this build is expected to fix.

---

## 9. Troubleshooting

**"You don't have the required permissions to perform this operation."**
Your logged-in EAS account doesn't have access to the `projectId` currently
set in `app.json` (Thaqib's personal project). Run `eas whoami` to confirm
which account you're on, then link your own project instead (Step 4).

**Credential setup fails / mentions non-interactive mode.**
Run `eas build` from a normal interactive terminal, not a script or CI
pipeline — the first-time Apple ID login and credential generation needs to
prompt you directly.

**Build succeeds but the app won't install on the device.**
Confirm the device was registered (Step 5) *before* the build ran — a device
added afterward isn't included in that build's provisioning profile; you'd
need to rebuild.
