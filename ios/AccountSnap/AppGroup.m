#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppGroup, NSObject)
RCT_EXTERN_METHOD(setString:(NSString *)key value:(NSString *)value)
RCT_EXTERN_METHOD(getString:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
RCT_EXTERN_METHOD(remove:(NSString *)key)
@end
