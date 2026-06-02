#import <React/RCTViewManager.h>
#import "AccountSnap-Swift.h"

@interface AdFitBannerViewManager : RCTViewManager
@end

@implementation AdFitBannerViewManager

RCT_EXPORT_MODULE(AdFitBannerView)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (UIView *)view {
  return [[AdFitBannerWrapper alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(clientId, NSString)
RCT_EXPORT_VIEW_PROPERTY(adWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(adHeight, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, NSNumber)

@end
