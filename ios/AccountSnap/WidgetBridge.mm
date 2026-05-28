#import "AccountSnapSpec/AccountSnapSpec.h"
#import "AccountSnap-Swift.h"
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface WidgetBridge : NSObject <NativeWidgetBridgeSpec>
@end

@implementation WidgetBridge

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)reload {
  [WidgetCenterHelper reloadAll];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWidgetBridgeSpecJSI>(params);
}

@end
