import { NativeModule, requireNativeModule } from 'expo';

import { ConfPresenceUwbModuleEvents } from './ConfPresenceUwb.types';

declare class ConfPresenceUwbModule extends NativeModule<ConfPresenceUwbModuleEvents> {
  isSupported(): Promise<boolean>;
  getDiscoveryToken(): Promise<string>;
  startRanging(rotatingId: string, peerTokenBase64: string): Promise<void>;
  stopRanging(rotatingId: string): Promise<void>;
  stopAllRanging(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ConfPresenceUwbModule>('ConfPresenceUwb');
