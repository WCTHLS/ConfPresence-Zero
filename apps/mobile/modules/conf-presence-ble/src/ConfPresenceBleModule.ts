import { NativeModule, requireNativeModule } from 'expo';

import { ConfPresenceBleModuleEvents } from './ConfPresenceBle.types';

declare class ConfPresenceBleModule extends NativeModule<ConfPresenceBleModuleEvents> {
  startAdvertising(rotatingId: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ConfPresenceBleModule>('ConfPresenceBle');
