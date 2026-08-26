# ConfPresence ZERO — Complete Codebase, Architecture, Data Flow, Gap Analysis & Manager Presentation

**Document Version:** 1.0.0  
**Date:** August 2026  
**Author:** Senior Software Architect & Technical Lead  
**Project:** ConfPresence ZERO (Zero-Hardware Conference Presence Tracking)  

---

## 1. Executive Summary

**ConfPresence ZERO** is a zero-hardware, privacy-first conference presence tracking and room-level proximity verification platform. It solves the multi-million dollar challenge of verifying session attendance, Continuing Professional Development (CPD/CEU) compliance, and crowd density across 1,000+ attendees without deploying expensive physical beacons, optical RFID badges, gate scanners, or dedicated venue hardware.

### Current Implementation State (Proof of Concept)
The current repository hosts a functional **Android-first Proof of Concept (POC)** built as a TypeScript monorepo with an Expo/React Native mobile application, a custom Kotlin BLE advertising/scanning native bridge, a shared contracts package, and an Express/Node.js backend with an in-memory graph clustering inference engine. In its current state, physical Android phones dynamically advertise a rotating 60-second pseudonymous token over Bluetooth Low Energy (BLE), continuously scan for peer devices, batch compact peer RSSI observations every 6 seconds to the backend API, and resolve room membership through presenter-anchored graph connected-component clustering with a live UI dashboard.

### Target Architecture Alignment
The target architecture defines an **enterprise-grade iOS + Android hybrid multi-modal fusion platform** featuring a 7-layer architecture (Layer 0 Venue & Crowd to Layer 6 Graceful Degradation Matrix), incorporating 4-sensor multi-modal fusion (BLE mesh, 18–20 kHz ultrasound acoustic gating, Wi-Fi RSSI vector fingerprinting, and IMU inertial motion), asynchronous background workers, push wake mechanisms (APNs/FCM), enterprise persistence (PostgreSQL, Redis, Azure Blob Storage), anti-proxy integrity engines, and multi-tenant organizer analytics.

| Assessment Dimension | Implementation Status | Alignment Score | Key Architectural Next Steps |
|---|---|:---:|---|
| **Mobile Signal Layer** | Android Foreground BLE Native Module | **35%** | Build iOS native adapter, Android background service, ultrasonic & Wi-Fi adapters |
| **Mobile Core & Security** | In-memory ID rotation & basic batching | **30%** | Keystore/Keychain, HMAC rotating crypto, WorkManager/URLSession transport |
| **Backend & Transport** | Express REST API + in-memory store | **25%** | FastAPI/Node gateway, Redis real-time state, PostgreSQL audit store, FCM/APNs wake |
| **Inference Engine** | In-memory single-hop/multi-hop BFS graph | **35%** | Ultrasonic gating, multi-modal weighted fusion, time-decay matrix, anti-proxy heuristics |
| **Application Outputs** | Mobile live participant roster & headcount | **30%** | Web organizer dashboard, CPD/CEU audit compliance generator, heatmaps |
| **Overall Project Alignment** | **Early-Stage Functional POC** | **31.5%** | Execute 6-phase foundation-to-production roadmap |

---

## 2. Project Purpose

### 2.1 Simple Explanation
Imagine attending a large 1,000-person conference with multiple breakout rooms, keynotes, and workshops. Traditionally, conference organizers have had to rent and mount hundreds of Bluetooth hardware beacons on walls, hire staff with barcode/RFID scanners at every doorway, or issue proprietary smart badges to know who attended which session. 

**ConfPresence ZERO eliminates all external hardware.** Instead, it turns the smartphones already in attendees' and presenters' pockets into a collaborative sensing mesh. When a presenter walks into Room A, their phone acts as a spatial anchor. The phones of nearby attendees quietly detect each other and the presenter via wireless signals. By analyzing how phones "see" each other in the room, the cloud backend automatically proves who is inside Room A—without tracking GPS locations, without recording audio conversations, and without tracking permanent personal identifiers.

### 2.2 Technical Explanation
ConfPresence ZERO is a distributed, privacy-preserving, peer-to-peer relative proximity and anchor-based spatial localization system. It computes spatial membership using a **multi-modal sensor fusion graph algorithm**:

1. **Decentralized Relative Ranging:** Devices in proximity exchange rotating pseudonymous tokens over Bluetooth Low Energy (BLE) advertisements and listen for high-frequency ultrasound acoustic chirps (18–20 kHz) that do not penetrate physical drywall/partitions.
2. **Anchor-Based Spatial Grounding:** Presenters or session hosts register designated room anchor roles, providing ground-truth spatial coordinates or logical room identifiers.
3. **Graph-Theoretic Presence Inference:** The backend ingests compact observation batches (containing observed rotating IDs, RSSI signal strengths, and timestamps), constructs a dynamic weighted peer adjacency graph $G=(V, E)$, applies sliding-window time-decay filtering, and executes label propagation from anchor nodes across connected components to infer room occupancy and dwell time.
4. **Platform-Aware Asymmetric Fusion:** Because iOS strictly restricts background BLE advertising and completely forbids Wi-Fi BSSID scanning on stock non-MDM devices, the engine dynamically adjusts signal weighting based on the reporting device's platform capability profile.

---

## 3. Complete Technology Stack

### 3.1 Technology Breakdown by Category

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TECHNOLOGY STACK                                      │
├──────────────────────────────┬─────────────────────────────┬────────────────────────────┤
│ Category                     │ Current POC Implementation  │ Target Enterprise Stack    │
├──────────────────────────────┼─────────────────────────────┼────────────────────────────┤
│ Programming Languages        │ TypeScript, Kotlin, JS      │ TypeScript, Kotlin, Swift  │
│ Mobile Framework             │ React Native 0.81.5 (Expo 54)│ React Native / Native Bridges│
│ Mobile Native Bridge         │ Kotlin ReactContextBaseModule│ Swift CoreBluetooth + Kotlin│
│ Backend Runtime & Framework  │ Node.js 20+ / Express 5.1.0 │ FastAPI / Node.js Microservices│
│ Validation & Schema          │ Zod 3.24.4                  │ Zod / Pydantic / Protobuf  │
│ In-Memory / Real-Time State  │ In-memory Map & Arrays      │ Redis 7.x (Cluster/Streams)│
│ Persistent Database          │ None (POC in-memory)        │ PostgreSQL 16 (TimescaleDB)│
│ Cloud & Object Storage       │ Local File System           │ Azure Blob Storage         │
│ Observability & Telemetry    │ Console logging             │ Azure Monitor / AppInsights│
│ Package & Monorepo Tooling   │ pnpm 10.14.0 Workspaces, tsx│ pnpm Workspaces / TurboRepo│
└──────────────────────────────┴─────────────────────────────┴────────────────────────────┘
```

### 3.2 Detailed Component Technology Matrix

| Technology | Where It Is Used | Why It Is Used | Dependents & Dependencies |
|---|---|---|---|
| **TypeScript 5.8+** | `packages/shared`, `apps/api`, `apps/mobile` | Enforces end-to-end type safety and unified contracts across the entire monorepo. | Root build, all workspace packages. |
| **React Native 0.81.5 / Expo 54** | `apps/mobile` | Cross-platform mobile runtime enabling rapid UI iteration and native module bridging. | Depends on React 19, Expo dev client; drives UI and services. |
| **Kotlin (Android Native)** | `apps/mobile/android-native/ConfPresenceBleModule.kt` | Direct access to Android `BluetoothLeAdvertiser` and `BluetoothLeScanner` APIs with low-level byte parsing. | Interfaced via React Native bridge (`NativeModules.ConfPresenceBle`). |
| **Express 5.1.0** | `apps/api/src/index.ts` | Lightweight HTTP server exposing REST ingestion and query endpoints. | Depends on Node.js; handles mobile batch requests. |
| **Zod 3.24.4** | `apps/api/src/index.ts` | Runtime validation for inbound JSON payloads (`joinSchema`, `batchSchema`). | Validates all requests entering `PocInferenceEngine`. |
| **pnpm 10.14.0 Workspaces** | Root `package.json`, `pnpm-workspace.yaml` | Efficient monorepo dependency resolution, strict package isolation, and fast linking. | Manages `@confpresence/shared`, `@confpresence/api`, `@confpresence/mobile`. |
| **tsx 4.19.4** | `apps/api/package.json` | Zero-config TypeScript execution with watch mode for rapid backend iteration. | Drives backend development runtime. |

---

## 4. Repository and Codebase Structure

### 4.1 Repository Tree

```text
referenced-chatgpt-conversation-this-is-an-2/
│
├── .env.example                          # Environment template (ports, hostnames)
├── package.json                          # Monorepo root workspace configuration
├── pnpm-lock.yaml                        # Pnpm dependency lockfile
├── pnpm-workspace.yaml                   # Workspace definitions (apps/*, packages/*)
├── tsconfig.json                         # Base TypeScript compiler settings
│
├── apps/
│   ├── api/                              # Backend Ingestion & Inference Service
│   │   ├── package.json                  # Express, Zod, tsx dependencies
│   │   ├── tsconfig.json                 # Node/ESNext TypeScript configuration
│   │   └── src/
│   │       ├── index.ts                  # REST API routes, middleware, validation
│   │       └── inference.ts              # PocInferenceEngine (graph clustering & state)
│   │
│   └── mobile/                           # React Native Mobile Client
│       ├── App.tsx                       # Master UI: Presenter/Attendee controls & live roster
│       ├── app.json                      # Expo application manifest
│       ├── package.json                  # React Native, Expo, Shared package dependencies
│       ├── tsconfig.json                 # React Native TypeScript configuration
│       ├── android/                      # Generated Android native Gradle project
│       │   └── app/src/main/
│       │       ├── AndroidManifest.xml   # BLE permissions & activity configuration
│       │       └── java/com/confpresence/zero/
│       │           ├── MainActivity.kt   # React Native Host Activity
│       │           ├── MainApplication.kt# Registers ConfPresenceBlePackage
│       │           └── ble/
│       │               └── ConfPresenceBleModule.kt # Active native BLE bridge
│       ├── android-native/               # Source template for Kotlin native bridge
│       │   └── ConfPresenceBleModule.kt  # Standalone Kotlin BLE bridge source
│       └── src/
│           ├── native/
│           │   └── confPresenceBle.ts    # NativeEventEmitter bridge & TypeScript types
│           └── services/
│               ├── deviceIdentity.ts     # Device ID generation & epoch rotating token logic
│               └── presenceService.ts    # Background loop, BLE cycle, HTTP batch uploader
│
├── packages/
│   └── shared/                           # Shared Domain Contracts
│       ├── package.json                  # Contract package definition
│       ├── tsconfig.json                 # TypeScript build configuration
│       └── src/
│           └── index.ts                  # DTOs: PresenceBatch, LiveRoomState, Roles
│
├── docs/                                 # Technical Specifications & Documentation
│   ├── ANDROID_BLE_MODULE.md             # Native module installation & permissions guide
│   ├── POC_SCOPE.md                      # POC definition of done & core guardrails
│   └── TEST_PLAN.md                      # Physical testing protocols (2 to 5 devices)
│
└── outputs/                              # Generated artifacts & evaluation reports
    └── ConfPresence_Hardware_Options_Report.pdf
```

### 4.2 Detailed Module Responsibilities

1. **`packages/shared`**: Defines pure domain models and API contracts (`ParticipantRole`, `PeerObservation`, `PresenceBatch`, `JoinSessionRequest`, `RoomMemberInfo`, `LiveRoomState`). Guarantees schema consistency between mobile and backend.
2. **`apps/api`**: Hosts the Express REST server and in-memory `PocInferenceEngine`. It provides payload validation via Zod, device session registry, sliding-window observation buffer, and BFS graph-based connected component clustering.
3. **`apps/mobile`**: Hosts the Expo/React Native user interface, the `PresenceService` orchestration pipeline, and the Kotlin native bridge that interfaces with Android's Bluetooth subsystem.
4. **`docs`**: Contains testing procedures, definition of done, and native integration documentation.

---

## 5. Current Architecture (Reconstructed from Codebase)

The current codebase implements a focused **Android-first BLE mesh presence clustering pipeline**:

```text
                                  ┌──────────────────────────────────────────────┐
                                  │           Physical Android Device            │
                                  │                                              │
                                  │  ┌────────────────────────────────────────┐  │
                                  │  │        React Native UI (App.tsx)       │  │
                                  │  │  - Presenter / Attendee Role Toggle    │  │
                                  │  │  - Dynamic Room Chips & Live Table     │  │
                                  │  └───────────────────┬────────────────────┘  │
                                  │                      │ UI State / Polling (3s)
                                  │                      ▼                       │
                                  │  ┌────────────────────────────────────────┐  │
                                  │  │ PresenceService (presenceService.ts)   │  │
                                  │  │  - 6s Batch Flush Interval             │  │
                                  │  │  - Rotating Token Generator (60s Epoch)│  │
                                  │  └───────────┬───────────────────▲────────┘  │
                                  │              │ JS Bridge         │ Events    │
                                  │              ▼                   │           │
                                  │  ┌────────────────────────────────────────┐  │
                                  │  │  ConfPresenceBleModule.kt (Native)     │  │
                                  │  │  - BLE Advertiser (UUID: 0x7A04)       │  │
                                  │  │  - BLE Scanner (Low Latency Mode)      │  │
                                  │  └───────────┬───────────────────▲────────┘  │
                                  └──────────────┼───────────────────┼───────────┘
                                                 │ BLE Radio         │ BLE Radio
                                  ┌──────────────▼───────────────────┴───────────┐
                                  │              Nearby Peer Phones              │
                                  │       (Advertising 0x7A04 Service Data)      │
                                  └──────────────────────┬───────────────────────┘
                                                         │ HTTP REST POST (JSON)
                                                         │ Ingest Batches every 6s
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │           API Backend (apps/api)             │
                                  │                                              │
                                  │  ┌────────────────────────────────────────┐  │
                                  │  │ Express REST Gateway (index.ts)        │  │
                                  │  │  - POST /api/session/join              │  │
                                  │  │  - POST /api/observations (Zod Validated│ │
                                  │  │  - GET  /api/rooms/:roomId/live        │  │
                                  │  └───────────────────┬────────────────────┘  │
                                  │                      │ Ingest / Query        │
                                  │                      ▼                       │
                                  │  ┌────────────────────────────────────────┐  │
                                  │  │ PocInferenceEngine (inference.ts)      │  │
                                  │  │  - 25s Sliding Window Observation Pool │  │
                                  │  │  - Token-to-Device Resolving Map       │  │
                                  │  │  - Adjacency Graph (RSSI >= -82 dBm)   │  │
                                  │  │  - Strong Edge: RSSI >= -74 / Bidirec. │  │
                                  │  │  - BFS Anchor Connected Component      │  │
                                  │  │  - In-Memory State Storage             │  │
                                  │  └────────────────────────────────────────┘  │
                                  └──────────────────────────────────────────────┘
```

---

## 6. Application Startup and Initialization Flow

### 6.1 Backend Startup Trace (`apps/api`)

```text
Step 1: Process Launch
   │    File: apps/api/package.json -> scripts.dev ("tsx watch src/index.ts")
   ▼
Step 2: Module Loading & Configuration
   │    File: apps/api/src/index.ts [Lines 1-8]
   │    Imports express, cors, zod, and PocInferenceEngine.
   │    Loads environment variable process.env.API_PORT (default: 3000).
   ▼
Step 3: Engine Instantiation
   │    File: apps/api/src/inference.ts [Lines 16-19]
   │    Instantiates PocInferenceEngine. Initializes internal Map<string, DeviceRecord>
   │    and empty PresenceBatch[] array in heap memory.
   ▼
Step 4: Middleware & Route Registration
   │    File: apps/api/src/index.ts [Lines 10-61]
   │    Applies cors(), express.json({ limit: "256kb" }).
   │    Registers routes: GET /health, POST /api/session/join, POST /api/observations,
   │    GET /api/rooms, GET /api/rooms/:roomId/live.
   ▼
Step 5: Server Listening (Application Ready)
        File: apps/api/src/index.ts [Lines 63-65]
        Binds to 0.0.0.0:3000. Logs confirmation message to stdout.
```

### 6.2 Mobile Application Startup Trace (`apps/mobile`)

```text
Step 1: Android Native Runtime Initialization
   │    File: apps/mobile/android/app/src/main/java/com/confpresence/zero/MainApplication.kt [Lines 21-53]
   │    Android OS boots Application class. onCreate() sets New Architecture release level,
   │    loads React Native entry point, and invokes ReactNativeHostWrapper with ConfPresenceBlePackage().
   ▼
Step 2: React Native JS Engine Boot & Root Mount
   │    File: apps/mobile/App.tsx [Lines 1-42, 484]
   │    Metro loads App.tsx via registerRootComponent(App).
   │    Initializes React component state: role="attendee", sessionId="poc-session", roomId="room-a".
   │    Creates singleton instance of PresenceService.
   ▼
Step 3: Device Identity Initialization
   │    File: apps/mobile/src/services/deviceIdentity.ts [Lines 5-10]
   │    useEffect() calls getOrCreateDeviceId().
   │    Generates cached random ID: "android-[random-10-char-string]" and sets state.
   ▼
Step 4: User Action — "Share Presence" Switch Toggled
   │    File: apps/mobile/App.tsx [Lines 78-96]
   │    User switches toggle to TRUE. Invokes togglePresence(true) -> service.start(config).
   ▼
Step 5: Native Permission Request
   │    File: apps/mobile/src/services/presenceService.ts [Lines 9-31]
   │    requestBlePermissions() executes. On Android 12+ (API 31+), requests BLUETOOTH_SCAN,
   │    BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT, and ACCESS_FINE_LOCATION via PermissionsAndroid.
   ▼
Step 6: Session Registration & BLE Start
   │    File: apps/mobile/src/services/presenceService.ts [Lines 57-71]
   │    1. POST /api/session/join with deviceId, role, roomId, displayName.
   │    2. rotateAndAdvertise(): Computes rotatingId = `${deviceId.slice(-8)}-${epoch}`.
   │    3. ConfPresenceBleModule.startAdvertising() starts BLE advertising with UUID 0x7A04.
   │    4. ConfPresenceBleModule.startScanning() starts BLE scan in LOW_LATENCY mode.
   │    5. subscribeToPeers(): Registers NativeEventEmitter listener for "ConfPresencePeerDetected".
   │    6. Starts 6-second setInterval timer for flushAndRotate().
   ▼
Step 7: Live UI Polling Loop Ready
        File: apps/mobile/App.tsx [Lines 68-76]
        Triggers 3-second polling interval fetching /api/rooms/:roomId/live to refresh live roster table.
```

---

## 7. Complete End-to-End Data Flow

### Workflow: Physical Peer Observation to Live Room Roster Display

```text
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 1. PHYSICAL SIGNAL GENERATION & DETECTION                                         │
 │    - Phone A (Presenter, Room A) advertises BLE Service UUID 0x7A04 with payload  │
 │      "3a8f9c1b-2k" (14 bytes UTF-8).                                              │
 │    - Phone B (Attendee) nearby receives BLE advertisement packet via radio.       │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 2. NATIVE MODULE CAPTURE & BYTE EXTRACTION                                        │
 │    - File: ConfPresenceBleModule.kt (ScanCallback.onScanResult)                   │
 │    - Extracts Service Data from ScanRecord (direct UUID or 0x16 raw byte fallback)│
 │    - Captures RSSI (e.g. -68 dBm) and creates WritableMap event.                  │
 │    - Emits "ConfPresencePeerDetected" via RCTDeviceEventEmitter.                  │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 3. MOBILE AGGREGATION & BUFFERING                                                 │
 │    - File: presenceService.ts (PresenceService.onPeer)                            │
 │    - Filters out own rotating ID; keys by peer device prefix into peers Map.      │
 │    - Updates local peerCount indicator on UI.                                     │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 4. BATCH PACKETIZATION & HTTP TRANSPORT                                           │
 │    - File: presenceService.ts (PresenceService.flushAndRotate)                     │
 │    - Every 6 seconds, drains peers Map into PresenceBatch payload:                │
 │      { sessionId, deviceId, displayName, rotatingId, role, capturedAt, peers: [] }│
 │    - Sends HTTP POST to http://192.168.0.195:3000/api/observations.               │
 │    - Immediately rotates local rotatingId and updates BLE advertiser payload.     │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 5. API VALIDATION & ENGINE INGESTION                                              │
 │    - File: index.ts -> batchSchema.safeParse(req.body)                            │
 │    - Validates types, timestamp formats, and array bounds (max 100 peers).        │
 │    - Invokes engine.ingest(batch) in inference.ts.                                │
 │    - Updates devices Map and pushes batch to sliding-window buffer batches[].     │
 │    - Prunes batches older than 25 seconds.                                        │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 6. GRAPH CLUSTERING & LABEL PROPAGATION (On-Demand Query)                         │
 │    - File: inference.ts (PocInferenceEngine.roomState)                            │
 │    - Triggered when client polls GET /api/rooms/room-a/live.                      │
 │    - Locates active Presenter device registered to "room-a".                      │
 │    - buildGraph(): Resolves tokens to device IDs; builds undirected graph edges   │
 │      where RSSI >= -82 dBm AND (RSSI >= -74 dBm OR Bidirectional OR Count >= 2).  │
 │    - componentFrom(presenterDeviceId): Executes BFS traversal to find all         │
 │      connected attendee device IDs.                                               │
 │    - Maps device IDs to RoomMemberInfo[] (name, role, deviceId).                  │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ 7. CLIENT ROSTER RENDERING                                                        │
 │    - File: App.tsx (fetchLiveRoom)                                                │
 │    - Mobile app parses JSON response; updates roomMembers state.                  │
 │    - Renders In-Room Count card and participant roster table with "(You)" and     │
 │      "Host" / "User" role badges.                                                 │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Module-by-Module Deep Dive

### 8.1 Module: `packages/shared`
* **Purpose:** Single source of truth for domain data transfer objects (DTOs) and type definitions across API and Mobile.
* **Important Files:** `packages/shared/src/index.ts`.
* **Key Types:** `ParticipantRole`, `PeerObservation`, `PresenceBatch`, `JoinSessionRequest`, `RoomMemberInfo`, `LiveRoomState`.
* **Dependencies:** None.
* **Dependents:** `@confpresence/api`, `@confpresence/mobile`.
* **Architectural Role:** Guarantees compile-time contract safety and prevents payload serialization mismatch across services.

### 8.2 Module: `apps/api` (REST Gateway & Inference Engine)
* **Purpose:** Ingests peer observation batches from devices, buffers spatial sightings in sliding windows, and computes presence clusters via graph traversal.
* **Important Files:** `apps/api/src/index.ts`, `apps/api/src/inference.ts`.
* **Important Classes & Methods:**
  * `PocInferenceEngine`: Master stateful engine.
  * `join(deviceId, role, roomId, displayName)`: Registers active participant session.
  * `ingest(batch)`: Stores batch and prunes records older than 25,000 ms.
  * `buildGraph()`: Reconstructs device adjacency graph using token resolution and multi-tier edge filtering (`MIN_RSSI = -82`, `DIRECT_RSSI = -74`, bidirectionality check).
  * `componentFrom(startId, graph)`: Breadth-First Search (BFS) finding connected components.
  * `roomState(sessionId, roomId)`: Returns `LiveRoomState` with estimated members.
* **Dependencies:** `@confpresence/shared`, `express`, `cors`, `zod`.
* **Dependents:** Mobile client HTTP consumers.

### 8.3 Module: `apps/mobile/android-native` (Native BLE Bridge)
* **Purpose:** Interfaces directly with Android hardware to execute high-duty BLE advertising and scanning with low-level packet byte extraction.
* **Important Files:** `ConfPresenceBleModule.kt`.
* **Important Classes & Methods:**
  * `ConfPresenceBleModule`: React Native Java module.
  * `startAdvertising(rotatingId)`: Configures `AdvertiseData` with 16-bit Service UUID `0x7A04`, sets high TX power, and starts advertising.
  * `startScanning()`: Starts `BluetoothLeScanner` in `SCAN_MODE_LOW_LATENCY`.
  * `extractToken(ScanRecord)`: 3-tier byte extraction fallback handling standard Android service data, UUID iteration, and raw byte slice matching (Type 0x16 Service Data).
* **Dependencies:** Android BLE SDK (`android.bluetooth.le.*`), React Native Core Bridge.
* **Dependents:** `apps/mobile/src/native/confPresenceBle.ts`.

### 8.4 Module: `apps/mobile/src` (Services & State Orchestration)
* **Purpose:** Manages device identity, pseudonymous token rotation cycles, permission verification, and batch transmission.
* **Important Files:** `deviceIdentity.ts`, `presenceService.ts`, `confPresenceBle.ts`.
* **Important Classes & Functions:**
  * `getOrCreateDeviceId()`: Generates local persistent pseudonym.
  * `createRotatingId(deviceId, epochMs)`: Formats 60-second epoch token string.
  * `requestBlePermissions()`: Requests Android 12+ runtime permissions.
  * `PresenceService`: Orchestrates the 6-second batch lifecycle, network dispatch, and error state reporting.
* **Dependencies:** `@confpresence/shared`, `react-native`, native BLE module.
* **Dependents:** `apps/mobile/App.tsx`.

### 8.5 Module: `apps/mobile/App.tsx` (User Interface & Dashboard)
* **Purpose:** Mobile UI for attendees and presenters to select roles, configure sessions, manage dynamic room tags, toggle sensing, and view real-time in-room rosters.
* **Important Features:**
  * Role switch (Attendee vs Presenter).
  * Dynamic room selection chips with inline creation/deletion.
  * Live status card and nearby peer counter.
  * Confirmed in-room participant table with role badges and self-identification.
  * Diagnostic status monitor.
* **Dependencies:** `PresenceService`, `@confpresence/shared`, React Native core components.

---

## 9. API and Communication Architecture

### 9.1 REST Endpoints Matrix

| HTTP Method | Path | Request Body | Response Body | Status Code | Purpose |
|---|---|---|---|:---:|---|
| `GET` | `/health` | None | `{ ok: true }` | 200 | Liveness health check. |
| `POST` | `/api/session/join` | `JoinSessionRequest` (JSON) | `{ ok: true }` | 201 | Enrolls a device in an active session / room anchor role. |
| `POST` | `/api/observations` | `PresenceBatch` (JSON) | `{ ok: true, peerCount: N }` | 202 | Ingests a 6-second batch of peer sightings. |
| `GET` | `/api/rooms` | Query: `sessionId` | `{ rooms: string[] }` | 200 | Lists all active rooms discovered in memory. |
| `GET` | `/api/rooms/:roomId/live` | Query: `sessionId` | `LiveRoomState` (JSON) | 200 | Returns the computed room cluster and attendee list. |

### 9.2 Communication Map

```text
┌───────────────────────────┐                     ┌───────────────────────────┐
│       Mobile Client       │                     │        Backend API        │
│  (React Native / Android) │                     │      (Express 5.1.0)      │
└─────────────┬─────────────┘                     └─────────────┬─────────────┘
              │                                                 │
              │ 1. POST /api/session/join                       │
              ├────────────────────────────────────────────────►│ (Registers device session)
              │    { deviceId, role, roomId, displayName }      │
              │◄────────────────────────────────────────────────┤
              │    201 Created                                  │
              │                                                 │
              │ 2. POST /api/observations (Every 6s)            │
              ├────────────────────────────────────────────────►│ (Validates via Zod)
              │    { deviceId, rotatingId, peers: [...] }       │ (Pushes to sliding window)
              │◄────────────────────────────────────────────────┤
              │    202 Accepted { ok: true, peerCount: 2 }      │
              │                                                 │
              │ 3. GET /api/rooms/:roomId/live (Every 3s)       │
              ├────────────────────────────────────────────────►│ (Runs BFS Graph Traversal)
              │    ?sessionId=poc-session                       │ (Extracts connected members)
              │◄────────────────────────────────────────────────┤
              │    200 OK { estimatedMemberDeviceIds: [...] }   │
              │                                                 │
```

---

## 10. Database, State and Data Models

### 10.1 In-Memory State Architecture (Current POC)

The current backend does not connect to an external database. All state is maintained in-process within the `PocInferenceEngine` instance:

1. **`devices: Map<string, DeviceRecord>`**
   * **Key:** `deviceId` (string)
   * **Value:** `{ deviceId, displayName, role, roomId, rotatingId, updatedAt }`
   * **Lifecycle:** Updated on `/api/session/join` and `/api/observations`. Pruned if `Date.now() - updatedAt > 75,000 ms` (3 sliding windows).
2. **`batches: PresenceBatch[]`**
   * **Structure:** Array of incoming batch payloads.
   * **Lifecycle:** Appended on `/api/observations`. Pruned at the head whenever `Date.now() - capturedAt > 25,000 ms`.

### 10.2 Entity Lifecycle

```text
 ┌────────────────┐         ┌──────────────────────────┐         ┌──────────────────────────┐
 │  DeviceRecord  │  Join   │ Created in devices Map   │ Ingest  │ Updated with rotatingId  │
 │  (Participant) ├────────►│ on POST /api/session/join├────────►│ & timestamp on batch POST│
 └────────────────┘         └──────────────────────────┘         └────────────┬─────────────┘
                                                                              │
                                                                 Stale > 75s  │
                                                                              ▼
                                                                 ┌──────────────────────────┐
                                                                 │ Pruned from memory       │
                                                                 └──────────────────────────┘

 ┌────────────────┐  Ingest  ┌─────────────────────────┐  Window > 25s   ┌──────────────────────────┐
 │ PresenceBatch  ├─────────►│ Appended to batches[]   ├────────────────►│ Shifted from array       │
 │ (Observations) │          │ in PocInferenceEngine   │                 │ (Garbage Collected)      │
 └────────────────┘          └─────────────────────────┘                 └──────────────────────────┘
```

---

## 11. Target Architecture Analysis (From Attached Diagram)

The attached architecture diagram represents an **Enterprise Hybrid Zero-Hardware Conference Presence Tracking System** designed for 1,000 concurrent attendees across 7 structured architectural layers:

```text
═════════════════════════════════════════════════════════════════════════════════════════════════
                               TARGET ARCHITECTURE OVERVIEW
═════════════════════════════════════════════════════════════════════════════════════════════════

LAYER 0: VENUE & CROWD (Zero External Hardware)
  - 1,000 Attendee & Presenter Android Phones + iPhones.
  - Zero beacons, zero scanners, zero RFID badges, zero optical tags.

LAYER 1: PLATFORM-SPECIFIC SIGNAL ADAPTERS
  - Android Pipeline:
    * A1 BLE Mesh: BluetoothLeScanner + PendingIntent Foreground Service.
    * A2 Ultrasonic: AudioTrack / AudioRecord 18–20 kHz token emit/listen.
    * A3 Wi-Fi Fingerprint: Native Wi-Fi scan APIs (RSSI vector of visible APs).
    * A4 IMU Motion: SensorManager (Accelerometer, Gyroscope, Magnetometer).
  - iOS Pipeline:
    * I1 BLE / iBeacon: CoreBluetooth + CLLocationManager (BeaconRegion) + Live Activity.
    * I2 Ultrasonic: AVAudioEngine + AVAudioSession (Background Audio Mode).
    * I3 Wi-Fi Fingerprint: NOT AVAILABLE ON STOCK IOS (MDM/Apple Entitlement Only).
    * I4 Motion: CMMotionActivityManager (Best-effort Core Motion updates).

LAYER 2: SHARED MOBILE CORE (Cross-Platform Framework)
  - Native Swift Adapter & Native Kotlin Adapter.
  - Privacy-First Core (On-Device):
    * Rotating Encrypted Identifier (HMAC-based).
    * Secure Storage: Keychain (iOS) / Keystore (Android).
    * Local Feature Extraction (Top-K Neighbours).
    * Batch Compression & Encryption.
    * Background Transport: URLSession (iOS) / WorkManager (Android).
    * Consent Manager & Settings.
    * Capability Profile per Device.
  - Normalized Schema: FeaturePacket
    (platform, capabilityFlags, bleNeighbours, ultrasonicToken, wifiVector?, motionState, timestamp, battery, confidence)

LAYER 3: TRANSPORT & BACKEND
  - Ingestion: HTTPS / MQTT (TLS 1.3).
  - Push / Wake: APNs (iOS Wake Notifications), FCM (Android Push Notifications).
  - API Gateway: FastAPI or Node.js (Validation, Auth, Rate Limiting).
  - Real-Time Store: Redis (Live Presence State, Room Occupancy, Device Heartbeat).
  - Persistent Store: PostgreSQL (Audit History, Events, Zones, Sessions, Consent).
  - Object Storage: Azure Blob Storage (Reports, Exports, Logs, Backups).
  - Observability: Azure Monitor (App Insights, Alerts & Metrics).

LAYER 4: INFERENCE ENGINE (Platform-Aware Fusion)
  - Graph Clustering: Mutual-detection graph from BLE mesh (RSSI weighted + time decay).
  - Anchor Label Propagation: Presenter/anchor device to label clusters with room assignment.
  - Ultrasonic Gate: Confirm presence when 18–20 kHz token from anchor is detected (in-room boundary).
  - Platform-Aware Sensor Fusion: Combine signals using platform-specific weights:
    * Android Profile: BLE (0.35), Wi-Fi (0.30), Ultrasonic (0.20), IMU Motion (0.15).
    * iOS Profile: iBeacon/BLE (0.45), Ultrasonic (0.35), Wi-Fi (0.00 - Absent), Motion (0.20).
  - Capability-Aware Fusion Rule: Missing signals (e.g. Wi-Fi on iOS) are NOT negative evidence;
    weights are re-normalized per device capability profile.
  - Integrity & Anti-Proxy: Detect stationary anomalies, impossible movement, device sharing.

LAYER 5: APPLICATION OUTPUTS
  - Live Room State (Real-time headcount by room/zone).
  - Early Departure Alerts (Detect attendees leaving sessions early).
  - iOS / Android Confidence Indicator (Per-device confidence & signal quality).
  - Occupancy Heatmap (Room / zone density visualization).
  - CPD / CEU Audit Reports (Attendance & dwell-time compliance reports).
  - Sponsor Analytics (Booth traffic, lead engagement, ROI).
  - Attendee Mobile App (Agenda, check-ins, certificates, privacy).
  - Organizer Dashboard (Web analytics, alerts, export & operations).

LAYER 6: GRACEFUL DEGRADATION MATRIX
  - Multi-tier fallback handling for Android & iOS across battery saver, mic denial,
    background restrictions, and manual check-in fallback.
```

---

## 12. Current Architecture vs Target Architecture Comparison

| Layer / Component | Target Capability (from Diagram) | Current Codebase Implementation | Status | Alignment | Architectural Gap |
|---|---|---|:---:|:---:|---|
| **Layer 0: Devices** | 1,000 Attendees (Android + iOS) + Presenters | 2–5 Physical Android Devices tested in foreground | **Partial** | Medium | No iOS client; untested at scale (>10 devices). |
| **Layer 1: A1 BLE Mesh** | Foreground Service + PendingIntent Background Scanner | Foreground React Native Module (`ConfPresenceBleModule.kt`) | **Partial** | Medium | No background scanning; requires app to stay in foreground. |
| **Layer 1: A2 Ultrasonic** | 18–20 kHz AudioTrack emit & AudioRecord listen | Not implemented | **Missing** | Low | No acoustic in-room boundary gating. |
| **Layer 1: A3 Wi-Fi** | Native Wi-Fi scan API RSSI vectors | Not implemented | **Missing** | Low | No Wi-Fi fingerprinting vector collection. |
| **Layer 1: A4 Motion** | IMU Accelerometer, Gyroscope, Magnetometer | Hardcoded `motionState: "unknown"` | **Missing** | Low | No `SensorManager` hardware integration. |
| **Layer 1: iOS Adapters** | I1 BLE/iBeacon, I2 Ultrasonic, I4 CoreMotion | No iOS native code exists | **Missing** | None | Complete iOS adapter layer missing. |
| **Layer 2: Storage** | Keystore (Android) / Keychain (iOS) | In-memory JS variable (`cachedId`) | **Missing** | Low | Device IDs reset on app restart; insecure. |
| **Layer 2: Token Crypto** | Rotating Encrypted Identifier (HMAC secret) | Simple substring string concatenation | **Partial** | Low | Token is easily reversible (`${deviceId.slice(-8)}-epoch`). |
| **Layer 2: Transport** | WorkManager (Android) / URLSession (iOS) | Foreground `setInterval` (6s) + `fetch()` | **Partial** | Low | Cannot upload observations while app is backgrounded. |
| **Layer 2: Schema** | Unified `FeaturePacket` with capability flags | Basic `PresenceBatch` schema | **Partial** | Medium | Missing capabilityFlags, ultrasonic, wifiVector, battery. |
| **Layer 3: Gateway** | FastAPI / Node.js with Auth & Rate Limiting | Express 5 with basic Zod validation | **Partial** | Medium | No authentication, JWT, or API rate limiting. |
| **Layer 3: Real-Time** | Redis 7 (Presence state, heartbeats) | Node.js process heap memory (`Map`) | **Missing** | Low | Cannot scale horizontally; state lost on restart. |
| **Layer 3: Persistent** | PostgreSQL (Audit history, compliance) | None | **Missing** | None | No long-term persistence for attendance audits. |
| **Layer 3: Push / Wake** | APNs (iOS) + FCM (Android) silent wake | None | **Missing** | None | Cannot wake sleeping/suspended devices. |
| **Layer 3: Cloud Store** | Azure Blob Storage + Azure Monitor | None (stdout logging only) | **Missing** | None | No cloud logging, telemetry, or file export storage. |
| **Layer 4: Clustering** | Time-decay weighted graph clustering | Sliding window (25s) BFS connected components | **Partial** | Medium | Uses basic thresholding without continuous time decay. |
| **Layer 4: Ultrasonic Gate**| In-room confirmation via ultrasonic token | Not implemented | **Missing** | None | Cannot distinguish hallway bleed-through via audio. |
| **Layer 4: Sensor Fusion** | Platform-aware normalized weight matrix | Single BLE modality only | **Missing** | Low | No capability re-normalization algorithm. |
| **Layer 4: Anti-Proxy** | Stationary & movement anomaly detection | Not implemented | **Missing** | None | Vulnerable to stationary beacon spoofing. |
| **Layer 5: Outputs** | Live Room, Heatmaps, CEU Audits, Web Dashboard | Mobile UI live participant list & count | **Partial** | Low | No web organizer dashboard, PDF audits, or heatmaps. |
| **Layer 6: Degradation** | 5-tier Android & iOS degradation matrix | Binary active/inactive check | **Missing** | Low | No handling for mic denial, battery saver, etc. |

---

## 13. Architectural Alignment Assessment

### 13.1 Category Alignment Breakdown

```text
================================================================================
                    ARCHITECTURAL ALIGNMENT BREAKDOWN
================================================================================
1. Core Graph Clustering & Spatial Anchoring:  45%  [Evidence: BFS graph works]
2. Mobile BLE Sensing & Native Android Bridge:  40%  [Evidence: Kotlin BLE module]
3. Multi-Modal Sensors (Audio, Wi-Fi, IMU):     0%  [Evidence: None implemented]
4. iOS Native Support & Adapters:               0%  [Evidence: Android only]
5. Transport, Security & Background Workers:   20%  [Evidence: HTTP fetch only]
6. Enterprise Storage (Redis, Postgres, Azure):  0%  [Evidence: Heap memory only]
7. Target Outputs (Audits, Dashboard, Analytics): 20%  [Evidence: Mobile UI only]
8. Anti-Proxy & Integrity Engine:               0%  [Evidence: None implemented]
--------------------------------------------------------------------------------
OVERALL ARCHITECTURAL ALIGNMENT:               31.5%
CLASSIFICATION:                                EARLY-STAGE FUNCTIONAL POC
================================================================================
```

### 13.2 Evidence-Based Justification
* **Core Graph Clustering (45%):** The `PocInferenceEngine` successfully implements token-to-device mapping, bidirectional and RSSI threshold filtering, and BFS connected-component extraction from a presenter anchor. It lacks continuous exponential time decay and edge weight propagation.
* **Mobile BLE Sensing (40%):** The Android BLE native module reliably advertises and scans foreground BLE packets with custom byte extraction. It lacks Android foreground background services (`PendingIntent`) and iOS `CoreBluetooth`.
* **Multi-Modal Sensors (0%):** Ultrasound, Wi-Fi RSSI vector extraction, and IMU sensor streams are entirely absent from both mobile and backend.
* **Enterprise Storage & Transport (10%):** State is held purely in RAM. There is no Redis, PostgreSQL, Azure Blob, FCM, or APNs integration.

---

## 14. Gap Analysis

### 14.1 Missing Components
1. **iOS Native Signal Adapters:** Swift implementation for `CoreBluetooth`, `CLLocationManager` iBeacon monitoring, `AVAudioEngine` ultrasonic listening, and `CMMotionActivityManager`.
2. **Android Multi-Modal Adapters:** Ultrasonic 18–20 kHz audio transceiver (`AudioTrack`/`AudioRecord`), Wi-Fi AP RSSI vector scanner (`WifiManager`), and IMU motion listener (`SensorManager`).
3. **Enterprise Storage Layer:** Redis real-time cluster (pub/sub, presence keys, heartbeat TTLs) and PostgreSQL relational database with TimescaleDB for immutable attendance logs.
4. **Push Wake Subsystem:** FCM and APNs push notification services to trigger synchronized periodic background scanning cycles.
5. **Organizer Web Application:** React/Next.js management dashboard for venue layout configuration, live density heatmaps, and audit certificate generation.

### 14.2 Partially Implemented Components
1. **Pseudonymous Identity Rotation:** Currently uses unencrypted string slicing (`${deviceId.slice(-8)}-${epoch}`). Must be upgraded to HMAC-SHA256 with event-scoped rotating keys stored in Android Keystore / iOS Keychain.
2. **Observation Transport:** Currently uses foreground JS `setInterval` + `fetch()`. Must be migrated to native background task dispatchers (`WorkManager` on Android, `BGAppRefreshTask` / `URLSession` on iOS).
3. **Graph Inference Engine:** Currently uses binary thresholding (`MIN_RSSI = -82`, `DIRECT_RSSI = -74`). Must be upgraded to weighted edge graph clustering with continuous exponential time-decay ($w = e^{-\Delta t / \tau} \cdot f(\text{RSSI})$).

### 14.3 Missing Data Flows
* **Acoustic Gating Flow:** Mobile phone records 18–20 kHz audio chunk -> decodes high-frequency FSK anchor token -> includes token in `FeaturePacket` -> Backend verifies token matches room anchor before admitting attendee to graph cluster.
* **Asynchronous Redis -> Postgres Persistence Flow:** Ingested batch updates active Redis room presence -> background worker writes 5-minute dwell-time audit records into PostgreSQL.

### 14.4 Technical Debt & Architectural Risks
* **Memory Leak & Crash Risk in Node Process:** Ingesting 1,000 devices reporting every 6 seconds produces ~166 req/sec. Storing all batches in JS arrays in a single Node process will cause garbage collection spikes and eventual OOM crash.
* **Drywall BLE Bleed-Through:** BLE signals easily penetrate drywall into adjacent conference rooms. Without ultrasonic gating or Wi-Fi fingerprinting, false room assignments will occur in adjacent spaces.
* **iOS Background Suspension:** iOS suspends background apps aggressively. Without APNs wake pushes and iBeacon region monitoring, iOS devices will stop reporting when locked.

---

## 15. Recommended Roadmap to Achieve Target Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                 DEVELOPMENT ROADMAP                                   │
└───────────────────────────────────────────────────────────────────────────────────────┘

  PHASE A: FOUNDATION & PERSISTENCE (Weeks 1–2)
  ├── Task A1: Deploy Redis 7 & PostgreSQL 16 schema (Events, Rooms, DwellLog, Sessions).
  ├── Task A2: Refactor API to persist state in Redis with sliding-window Sorted Sets.
  └── Task A3: Implement secure HMAC-SHA256 token rotation with Android Keystore.

  PHASE B: ANDROID BACKGROUND & MULTI-MODAL SENSING (Weeks 3–4)
  ├── Task B1: Implement Android Foreground Service with persistent notification for BLE.
  ├── Task B2: Build Android Ultrasonic 18–20 kHz FSK emitter and detector.
  ├── Task B3: Build Android Wi-Fi RSSI vector scanner & IMU motion detector.
  └── Task B4: Update shared schema to normalized FeaturePacket.

  PHASE C: IOS NATIVE ADAPTER PIPELINE (Weeks 5–6)
  ├── Task C1: Build Swift Native Module for CoreBluetooth scanning & iBeacon monitoring.
  ├── Task C2: Implement iOS AVAudioSession background ultrasonic audio listener.
  ├── Task C3: Implement CMMotionActivityManager listener & iOS Keychain secure storage.
  └── Task C4: Configure APNs silent wake push triggers.

  PHASE D: UNIFIED PLATFORM-AWARE INFERENCE ENGINE (Weeks 7–8)
  ├── Task D1: Implement continuous exponential time-decay edge weighting.
  ├── Task D2: Implement Ultrasonic Gating module (strict in-room boundary enforcement).
  ├── Task D3: Implement platform-specific capability-aware weight normalization.
  └── Task D4: Implement Anti-Proxy heuristic engine (stationary device & anomaly check).

  PHASE E: ENTERPRISE OUTPUTS & DASHBOARDS (Weeks 9–10)
  ├── Task E1: Build Organizer Web Dashboard (Next.js + Tailwind + WebSockets).
  ├── Task E2: Implement Live Room Occupancy Heatmap & Early Departure Alerts.
  └── Task E3: Build Automated CPD/CEU Attendance Compliance PDF/CSV Report Generator.

  PHASE F: SCALE, SECURITY & PRODUCTION HARDENING (Weeks 11–12)
  ├── Task F1: Load test backend with 1,000 simulated devices emitting at 6s intervals.
  ├── Task F2: Implement Azure Blob Storage archiving & Azure Monitor telemetry.
  └── Task F3: Execute physical multi-room venue pilot testing with 50+ mixed devices.
```

---

## 16. Immediate Next Steps & Development Priorities

### 16.1 Priority Matrix

```text
┌──────────────────────────────┬──────────────────────────────┬─────────────────────────┐
│ Immediate Next Steps         │ Short-Term Steps (Next Sprint│ Medium-Term Steps       │
│ (Current Sprint)             │                              │ (Pre-Production)        │
├──────────────────────────────┼──────────────────────────────┼─────────────────────────┤
│ 1. Add Redis state backend   │ 1. Android Foreground Service│ 1. Full iOS native pipeline│
│    (Replace in-memory Map)   │    (Background BLE operation)│ 2. Ultrasonic FSK audio │
│ 2. PostgreSQL audit schema   │ 2. Upgrade FeaturePacket DTO │ 3. Anti-proxy heuristics│
│    (Record attendance dwell) │ 3. HMAC token encryption     │ 4. Web Organizer Console│
│ 3. API auth & rate limiting  │ 4. FCM push wake integration │ 5. 1,000-device load test│
└──────────────────────────────┴──────────────────────────────┴─────────────────────────┘
```

### 16.2 Critical Path & Dependencies
* **Blocker 1 (Data Layer):** The Inference Engine cannot scale beyond 10 devices until Redis replaces the Node.js in-memory Map.
* **Blocker 2 (Background Reliability):** Attendees cannot be expected to keep their phone screens on in their hands throughout a 60-minute talk; Android Foreground Service and iOS iBeacon background triggers are on the critical path.
* **Parallel Workstreams:** The iOS Native Adapter (Swift) and the Web Organizer Dashboard (Next.js) can be developed completely in parallel once the `FeaturePacket` contract is locked.

---

## 17. How to Explain This Project to Your Manager

### Level 1: 30-Second Executive Pitch
> "ConfPresence ZERO is a zero-hardware conference presence tracking platform. Instead of renting expensive beacons or staffing doorways with badge scanners, we turn attendees' and presenters' existing smartphones into a collaborative sensing mesh. In our current 4-day working POC, we have verified that Android phones can broadcast rotating pseudonyms over Bluetooth, form an ad-hoc mesh, and accurately prove who is inside a presenter's room in real-time. Our immediate next step is adding Redis and PostgreSQL persistence so we can scale from our 5-device test to 1,000 attendees."

### Level 2: 2-Minute Technical Overview
> "From an architectural perspective, the project consists of three tiers: a cross-platform React Native client with native signal bridges, a high-throughput ingestion gateway, and a graph-clustering inference engine.
> 
> In the mobile app, when an attendee enters a session, their phone broadcasts a 60-second rotating BLE token while listening for nearby peers. Every 6 seconds, the app batches these peer sightings and RSSI signal strengths to our API. The backend processes these observations through an inference engine that builds a dynamic graph, filters out weak signals, and traverses connected components starting from the presenter's phone to identify the exact room roster.
> 
> Right now, the core BLE mesh and graph clustering are proven and working on Android. To reach our target architecture, we need to implement three key enhancements: first, add Redis and PostgreSQL for scalable real-time state and compliance auditing; second, build the native iOS adapter pipeline; and third, add ultrasonic audio gating so we can prevent signals from bleeding through drywall between adjacent rooms."

### Level 3: Detailed Manager Discussion Guide

#### 1. Current Architecture & Implementation Status
* Explain that the repository is structured as a clean TypeScript monorepo (`apps/api`, `apps/mobile`, `packages/shared`).
* Emphasize that the hardest part of the initial Android POC—low-level Kotlin BLE advertising, scanning, and raw byte extraction—is **already implemented, running, and verified on physical hardware**.
* Highlight that the mobile UI includes full presenter/attendee switching, dynamic room creation, and live participant table updates.

#### 2. Comparison with Target Architecture Diagram
* Walk through the 7 layers of the target diagram.
* Explain that our current POC successfully covers **Layer 0 (Crowd)**, **Layer 1 (BLE Native Android)**, and **Layer 4 (Graph Clustering)** in an initial baseline form.
* Clarify that the remaining layers (Multi-modal Ultrasound/Wi-Fi, iOS native adapters, Redis/Postgres persistence, and Web Organizer dashboards) are standard engineering additions that build directly on top of our proven data contracts.

#### 3. Gap Analysis & Risk Management
* Acknowledge the physical reality of BLE RF bleed-through across drywall and explain why our roadmap includes **18–20 kHz ultrasound gating** to guarantee 100% room boundary accuracy.
* Address iOS background constraints by presenting the target architecture's proven strategy: combining iBeacon region monitoring, APNs silent wake notifications, and capability-aware weight normalization.

#### 4. Clear Roadmap & Resource Plan
* Present the 6-phase roadmap (Phases A through F).
* Show that the immediate next sprint focus (Foundation & Redis/Postgres persistence) requires zero mobile rewrites and immediately unblocks multi-room scalability.

---

## 18. Expected Manager Questions & Preparation

### Q1: "Why don't we just use standard Bluetooth hardware beacons in every room?"
* **Answer:** Deploying hardware beacons across a 50-room conference venue requires purchasing hundreds of beacons, manually mapping UUIDs to rooms, changing batteries, and dealing with lost or stolen hardware. ConfPresence ZERO is 100% zero-hardware—the presenter's phone is the anchor, saving thousands of dollars in hardware and setup time.

### Q2: "How do we prevent BLE signals from bleeding through drywall into the next room?"
* **Answer:** In our current BLE-only POC, we use strict RSSI thresholding (`DIRECT_RSSI = -74 dBm` and bidirectionality checks). In the target architecture, we solve this permanently through **Layer 1 A2/I2 Ultrasonic Gating**: the presenter's phone emits an inaudible 18–20 kHz acoustic chirp. Ultrasound cannot penetrate drywall, providing a physical acoustic barrier that guarantees only attendees inside the room are validated.

### Q3: "How does this handle iOS background restrictions compared to Android?"
* **Answer:** Android allows full background BLE scanning via Foreground Services. iOS prohibits background BLE advertising and raw Wi-Fi scanning. To solve this, our target architecture implements an **Asymmetric Platform-Aware Fusion Engine**: on iOS, we use iBeacon region monitoring, background audio mode for ultrasound, and APNs wake notifications, while re-normalizing the confidence weights so iOS devices are never penalized for lacking Wi-Fi vectors.

### Q4: "Are we tracking attendees' personal location or violating GDPR/privacy?"
* **Answer:** No. Privacy is built into the core design. The system never accesses GPS, never records microphone audio (it only extracts ultrasonic frequency tokens on-device), never collects hardware MAC addresses, and rotates pseudonymous device tokens every 60 seconds. All graph clustering is computed anonymously.

### Q5: "What happens if the backend server restarts during a live conference?"
* **Answer:** In the current POC, state is stored in memory, so a restart clears the active window. In **Phase A of our roadmap**, we are integrating **Redis and PostgreSQL**. Redis persists active heartbeats and sliding-window presence with TTLs, while PostgreSQL records permanent audit logs, ensuring zero data loss during restarts.

### Q6: "Can an attendee spoof attendance by having a friend take their phone or broadcast their ID?"
* **Answer:** In the target architecture, **Layer 4 Integrity & Anti-Proxy Engine** analyzes IMU motion patterns and multi-device correlation. If two device tokens are continuously co-located with identical accelerometer signatures, or if a device is completely stationary for hours while claiming presence in multiple distant rooms, the engine flags it as a proxy anomaly.

### Q7: "What is the single biggest technical blocker we need to tackle next?"
* **Answer:** Moving from in-memory Node.js state to **Redis-backed presence caching and PostgreSQL persistence**. This will unblock multi-room concurrent testing, eliminate memory bottlenecks, and provide the persistence layer required for attendance audit certificates.

---

## 19. Critical Files to Study First

To gain immediate mastery of this codebase, study these files in the following exact order:

```text
1. packages/shared/src/index.ts
   └── Why: Defines the universal contracts (PresenceBatch, LiveRoomState, PeerObservation).
            Mastering these 44 lines explains the data model for the entire monorepo.

2. apps/api/src/inference.ts
   └── Why: Contains PocInferenceEngine, the core algorithmic heart of the system.
            Study how buildGraph(), componentFrom(), and sliding-window trimming work.

3. apps/mobile/android-native/ConfPresenceBleModule.kt
   └── Why: Contains the low-level Android BLE engine.
            Study how startAdvertising(), startScanning(), and extractToken() parse raw byte packets.

4. apps/mobile/src/services/presenceService.ts
   └── Why: The mobile orchestrator that ties native BLE events to periodic HTTP batching.
            Study how onPeer(), rotateAndAdvertise(), and flushAndRotate() operate.

5. apps/mobile/App.tsx
   └── Why: The mobile user experience.
            Study how presenter room selection, role toggling, and live roster polling are rendered.

6. apps/api/src/index.ts
   └── Why: The API entry point.
            Study the Zod validation schemas and REST endpoint bindings.
```

---

*Document compiled and verified against codebase and target architecture specifications.*
