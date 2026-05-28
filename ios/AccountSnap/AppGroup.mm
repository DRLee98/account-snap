#import "AccountSnapSpec/AccountSnapSpec.h"
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

static NSString *const kAppGroupSuite = @"group.com.drlee98.accountsnap";

@interface AppGroup : NSObject <NativeAppGroupSpec>
@end

@implementation AppGroup

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSUserDefaults *)suite {
  return [[NSUserDefaults alloc] initWithSuiteName:kAppGroupSuite];
}

- (void)setString:(NSString *)key value:(NSString *)value {
  [[self suite] setObject:value forKey:key];
}

- (void)getString:(NSString *)key
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  NSString *value = [[self suite] stringForKey:key];
  resolve(value ?: [NSNull null]);
}

- (void)remove:(NSString *)key {
  [[self suite] removeObjectForKey:key];
}

- (facebook::react::ModuleConstants<JS::NativeAppGroup::Constants>)constantsToExport {
  return [self getConstants];
}

- (facebook::react::ModuleConstants<JS::NativeAppGroup::Constants>)getConstants {
  NSURL *url = [[NSFileManager defaultManager]
    containerURLForSecurityApplicationGroupIdentifier:kAppGroupSuite];
  NSString *path = url ? url.path : @"";

  return facebook::react::typedConstants<JS::NativeAppGroup::Constants>({
    .containerPath = path,
    .suiteName = kAppGroupSuite,
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeAppGroupSpecJSI>(params);
}

@end
