import UIKit
import UserNotifications
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  fileprivate var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "AccountSnap",
      in: window,
      launchOptions: launchOptions
    )

    // 위젯에서 즉시 복사 시 system banner를 띄우기 위한 알림 권한 요청 (포그라운드에서도 표시되도록 delegate 설정)
    let center = UNUserNotificationCenter.current()
    center.delegate = NotificationDelegate.shared
    center.requestAuthorization(options: [.alert, .badge]) { _, _ in }

    return true
  }
}

private final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
  static let shared = NotificationDelegate()
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler:
                                @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .list])
  }
}

fileprivate class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // 8082: jangboo-rn-monorepo Metro가 8081 점거 시 충돌 회피
    URL(string: "http://192.168.21.24:8082/index.bundle?platform=ios&dev=true&minify=false")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
