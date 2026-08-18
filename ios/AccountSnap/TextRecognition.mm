#import "AccountSnapSpec/AccountSnapSpec.h"
#import "AccountSnap-Swift.h"
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface TextRecognition : NSObject <NativeTextRecognitionSpec>
@end

@implementation TextRecognition

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)recognize:(NSString *)imageUri
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [TextRecognitionHelper recognize:imageUri
      resolve:^(NSString *text, double confidence) {
        resolve(@{ @"text" : text, @"confidence" : @(confidence) });
      }
      reject:^(NSString *message) {
        reject(@"text_recognition_failed", message, nil);
      }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeTextRecognitionSpecJSI>(
      params);
}

@end
