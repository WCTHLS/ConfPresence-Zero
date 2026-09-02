#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ConfPresenceWifi, NSObject)

RCT_EXTERN_METHOD(getWifiFingerprint:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end