# Android BLE module integration

`apps/mobile/android-native/ConfPresenceBleModule.kt` is the native bridge used by the React Native app.

## Before running on a phone

1. Generate a React Native Android project using the React Native Community CLI, or add an Android project to the app.
2. Copy the Kotlin file into the generated app package, for example `android/app/src/main/java/com/confpresence/ble/`.
3. Register `ConfPresenceBlePackage` in `MainApplication.kt`.
4. Add the Android 12+ Bluetooth permissions shown in the file's comment to `AndroidManifest.xml`.
5. Build and install on a physical Android device. Emulators cannot validate BLE advertising/scanning.

The native bridge deliberately supports the foreground POC only. Background services, reliable iOS behavior, token signing, and secure device registration are later work.
