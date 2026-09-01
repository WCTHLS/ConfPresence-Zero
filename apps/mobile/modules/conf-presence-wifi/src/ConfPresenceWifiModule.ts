import { NativeModule, requireNativeModule } from 'expo';

import { WifiAccessPoint } from './ConfPresenceWifi.types';

declare class ConfPresenceWifiModule extends NativeModule<{}> {
  getWifiFingerprint(): Promise<WifiAccessPoint[]>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ConfPresenceWifiModule>('ConfPresenceWifi');
