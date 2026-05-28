import AppIntents
import Foundation
import UIKit
import UserNotifications
import WidgetKit

private let appGroupId = "group.com.drlee98.accountsnap"
private let keyAccounts = "widget:accounts"
private let keyLastUsedId = "widget:lastUsedId"
private let keyPendingCopy = "widget:pendingCopyId"

@available(iOS 17.0, *)
struct CopyAccountIntent: AppIntent {
  static var title: LocalizedStringResource = "계좌번호 복사"
  static var description = IntentDescription("위젯에서 계좌번호를 즉시 클립보드에 복사합니다.")

  @Parameter(title: "Account ID")
  var accountId: String

  init() {}
  init(accountId: String) { self.accountId = accountId }

  func perform() async throws -> some IntentResult {
    guard let suite = UserDefaults(suiteName: appGroupId) else {
      return .result()
    }
    let json = suite.string(forKey: keyAccounts) ?? "[]"
    let accounts = (try? JSONDecoder().decode([WidgetAccount].self, from: Data(json.utf8))) ?? []
    guard let acc = accounts.first(where: { $0.id == accountId }) else {
      return .result()
    }
    UIPasteboard.general.string = acc.accountNumber
    suite.set(accountId, forKey: keyLastUsedId)
    suite.set(accountId, forKey: keyPendingCopy)
    WidgetCenter.shared.reloadAllTimelines()

    let title = acc.label ?? acc.bankName
    let content = UNMutableNotificationContent()
    content.title = "복사됨 · \(title)"
    content.body = acc.accountNumber
    let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await UNUserNotificationCenter.current().add(req)

    return .result()
  }
}
