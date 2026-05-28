import Foundation
import React

@objc(AppGroup)
class AppGroup: NSObject {
  private static let suiteName = "group.com.drlee98.accountsnap"
  private let suite = UserDefaults(suiteName: AppGroup.suiteName)

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func constantsToExport() -> [AnyHashable: Any]! {
    let path = FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: AppGroup.suiteName)?
      .path ?? ""
    return ["containerPath": path, "suiteName": AppGroup.suiteName]
  }

  @objc(setString:value:)
  func setString(_ key: String, value: String) {
    suite?.set(value, forKey: key)
  }

  @objc(getString:resolver:rejecter:)
  func getString(_ key: String,
                 resolver: @escaping RCTPromiseResolveBlock,
                 rejecter: @escaping RCTPromiseRejectBlock) {
    resolver(suite?.string(forKey: key) ?? NSNull())
  }

  @objc(remove:)
  func remove(_ key: String) {
    suite?.removeObject(forKey: key)
  }
}
