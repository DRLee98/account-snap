import WidgetKit
import SwiftUI
import AppIntents

private let appGroupId = "group.com.drlee98.accountsnap"
private let keyAccounts = "widget:accounts"
private let keyLastUsedId = "widget:lastUsedId"

private let cameraURL = URL(string: "accountsnap://camera")!
private func copyURL(_ id: String) -> URL {
    URL(string: "accountsnap://copy/\(id)")!
}

/// iOS 17+에서는 App Intent로 앱을 띄우지 않고 즉시 클립보드 복사,
/// iOS 16 이하는 deep link fallback (앱 열리며 RN이 복사 처리)
@ViewBuilder
private func copyTrigger<Content: View>(for a: WidgetAccount,
                                        @ViewBuilder content: () -> Content) -> some View {
    if #available(iOS 17.0, *) {
        Button(intent: CopyAccountIntent(accountId: a.id)) {
            content()
        }
        .buttonStyle(.plain)
    } else {
        Link(destination: copyURL(a.id)) {
            content()
        }
    }
}

struct WidgetAccount: Identifiable, Decodable {
    let id: String
    let bankName: String
    let accountNumber: String
    let label: String?
    let isFavorite: Bool
}

struct AccountEntry: TimelineEntry {
    let date: Date
    let lastUsed: WidgetAccount?
    let favorites: [WidgetAccount]
}

private func loadEntry() -> AccountEntry {
    guard let suite = UserDefaults(suiteName: appGroupId) else {
        return AccountEntry(date: Date(), lastUsed: nil, favorites: [])
    }
    let json = suite.string(forKey: keyAccounts) ?? "[]"
    let accounts = (try? JSONDecoder().decode([WidgetAccount].self, from: Data(json.utf8))) ?? []
    let lastId = suite.string(forKey: keyLastUsedId)
    let lastUsed = lastId.flatMap { id in accounts.first(where: { $0.id == id }) } ?? accounts.first
    let favorites = accounts.filter { $0.isFavorite }
    return AccountEntry(date: Date(), lastUsed: lastUsed, favorites: favorites)
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> AccountEntry {
        AccountEntry(date: Date(), lastUsed: nil, favorites: [])
    }
    func getSnapshot(in context: Context, completion: @escaping (AccountEntry) -> ()) {
        completion(loadEntry())
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<AccountEntry>) -> ()) {
        completion(Timeline(entries: [loadEntry()], policy: .never))
    }
}

private func formatAccountNumber(_ raw: String) -> String {
    var out: [String] = []
    var idx = raw.startIndex
    while idx < raw.endIndex {
        let next = raw.index(idx, offsetBy: 4, limitedBy: raw.endIndex) ?? raw.endIndex
        out.append(String(raw[idx..<next]))
        idx = next
    }
    return out.joined(separator: "-")
}

/// small: 촬영 단축 (앱 정체성 = OCR 도구)
struct SmallShortcutView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "camera.fill")
                .font(.system(size: 36, weight: .semibold))
                .foregroundColor(.accentColor)
            Text("이체 계좌 촬영").font(.headline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(cameraURL)
    }
}

/// medium: 큰 촬영 버튼 + 최근 계좌 1개
struct MediumView: View {
    let entry: AccountEntry
    var body: some View {
        HStack(spacing: 14) {
            Link(destination: cameraURL) {
                VStack(spacing: 6) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.accentColor)
                    Text("촬영").font(.caption).bold()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.accentColor.opacity(0.15))
                .cornerRadius(12)
            }
            .frame(width: 90)

            if let a = entry.lastUsed {
                copyTrigger(for: a) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("최근 추출").font(.caption2).foregroundColor(.secondary)
                        Text(a.label ?? a.bankName).font(.subheadline).bold().lineLimit(1)
                        if a.label != nil {
                            Text(a.bankName).font(.caption2).foregroundColor(.secondary)
                        }
                        Spacer(minLength: 2)
                        Text(formatAccountNumber(a.accountNumber))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text("최근 추출").font(.caption2).foregroundColor(.secondary)
                    Spacer()
                    Text("아직 없어요").font(.caption).foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
    }
}

/// large: 큰 촬영 버튼 + 즐겨찾기 리스트
struct LargeView: View {
    let entry: AccountEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Link(destination: cameraURL) {
                HStack(spacing: 12) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.accentColor)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("계좌 촬영").font(.subheadline).bold()
                        Text("이체할 이체 계좌 촬영하기").font(.caption2).foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(12)
                .background(Color.accentColor.opacity(0.15))
                .cornerRadius(12)
            }

            if entry.favorites.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    Label("즐겨찾기한 계좌가 없어요", systemImage: "star")
                        .font(.caption).foregroundColor(.secondary)
                    Spacer()
                }
                Spacer()
            } else {
                Label("즐겨찾기", systemImage: "star.fill")
                    .font(.caption2).foregroundColor(.secondary)
                ForEach(entry.favorites.prefix(5)) { a in
                    copyTrigger(for: a) {
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(a.label ?? a.bankName).font(.caption).bold().lineLimit(1)
                                Text("\(a.bankName) · \(formatAccountNumber(a.accountNumber))")
                                    .font(.caption2).foregroundColor(.secondary).lineLimit(1)
                            }
                            Spacer()
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }
}

struct AccountSnapWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry
    var body: some View {
        switch family {
        case .systemSmall:
            SmallShortcutView()
        case .systemMedium:
            MediumView(entry: entry)
        case .systemLarge:
            LargeView(entry: entry)
        default:
            SmallShortcutView()
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
        .configurationDisplayName("스냅넘버")
        .description("이체 계좌 촬영 단축 + 최근/즐겨찾기")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview(as: .systemSmall) {
    AccountSnapWidget()
} timeline: {
    AccountEntry(date: .now, lastUsed: nil, favorites: [])
}
