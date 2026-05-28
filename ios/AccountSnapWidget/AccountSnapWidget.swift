import WidgetKit
import SwiftUI

private let appGroupId = "group.com.drlee98.accountsnap"
private let storageKey = "poc:lastAccount"

private func loadAccount() -> String {
    guard let suite = UserDefaults(suiteName: appGroupId) else {
        return "(no suite)"
    }
    return suite.string(forKey: storageKey) ?? "(empty)"
}

struct AccountEntry: TimelineEntry {
    let date: Date
    let account: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> AccountEntry {
        AccountEntry(date: Date(), account: "—")
    }
    func getSnapshot(in context: Context, completion: @escaping (AccountEntry) -> ()) {
        completion(AccountEntry(date: Date(), account: loadAccount()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<AccountEntry>) -> ()) {
        let entry = AccountEntry(date: Date(), account: loadAccount())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct AccountSnapWidgetEntryView: View {
    var entry: Provider.Entry
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("최근 계좌").font(.caption).foregroundColor(.secondary)
            Text(entry.account).font(.body).bold().lineLimit(2)
        }
    }
}

struct AccountSnapWidget: Widget {
    let kind: String = "AccountSnapWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                AccountSnapWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                AccountSnapWidgetEntryView(entry: entry).padding().background()
            }
        }
        .configurationDisplayName("Account Snap")
        .description("최근 추출한 계좌번호")
        .supportedFamilies([.systemSmall])
    }
}

#Preview(as: .systemSmall) {
    AccountSnapWidget()
} timeline: {
    AccountEntry(date: .now, account: "110-1234-5678-9012")
}
