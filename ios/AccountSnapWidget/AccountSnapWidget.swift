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

private let widgetAccent = Color(red: 30.0 / 255.0, green: 45.0 / 255.0, blue: 110.0 / 255.0)

/// small에서는 navy 전체 배경, medium/large는 시스템 배경.
struct WidgetContainerBackground: View {
    @Environment(\.widgetFamily) var family
    var body: some View {
        if family == .systemSmall {
            widgetAccent
        } else {
            Color(UIColor.systemBackground)
        }
    }
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
    let bankCode: String?
    let accountNumber: String
    let label: String?
    let isFavorite: Bool
}

private struct BankPattern {
    let code: String
    let groups: [[Int]]
}

private let BANK_PATTERNS: [BankPattern] = [
    BankPattern(code: "004", groups: [[3, 2, 4, 3], [3, 4, 7]]),
    BankPattern(code: "088", groups: [[3, 3, 6], [3, 2, 6]]),
    BankPattern(code: "020", groups: [[4, 3, 6]]),
    BankPattern(code: "081", groups: [[3, 6, 5]]),
    BankPattern(code: "011", groups: [[3, 4, 4, 2]]),
    BankPattern(code: "003", groups: [[3, 6, 2, 3]]),
    BankPattern(code: "090", groups: [[4, 2, 7]]),
    BankPattern(code: "092", groups: [[4, 4, 4]]),
    BankPattern(code: "089", groups: [[3, 3, 6]]),
    BankPattern(code: "023", groups: [[3, 2, 6]]),
    BankPattern(code: "027", groups: [[3, 3, 6]]),
    BankPattern(code: "071", groups: [[6, 2, 6]]),
    BankPattern(code: "045", groups: [[4, 4, 5]]),
    BankPattern(code: "048", groups: [[4, 4, 5]]),
]

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

private func defaultGroupFormat(_ raw: String, groupSize: Int = 4) -> String {
    var out: [String] = []
    var idx = raw.startIndex
    while idx < raw.endIndex {
        let next = raw.index(idx, offsetBy: groupSize, limitedBy: raw.endIndex) ?? raw.endIndex
        out.append(String(raw[idx..<next]))
        idx = next
    }
    return out.joined(separator: "-")
}

private func formatAccountByBank(_ raw: String, bankCode: String?) -> String {
    let digits = String(raw.filter { $0.isNumber })
    guard let code = bankCode, !code.isEmpty,
          let bank = BANK_PATTERNS.first(where: { $0.code == code }),
          let groups = bank.groups.first(where: { $0.reduce(0, +) == digits.count })
    else {
        return defaultGroupFormat(digits)
    }
    var out: [String] = []
    var idx = digits.startIndex
    for len in groups {
        let next = digits.index(idx, offsetBy: len, limitedBy: digits.endIndex) ?? digits.endIndex
        out.append(String(digits[idx..<next]))
        idx = next
    }
    return out.joined(separator: "-")
}

/// small: 촬영 단축 (앱 정체성 = OCR 도구). 배경은 containerBackground로 적용.
struct SmallShortcutView: View {
    var body: some View {
        VStack(spacing: 10) {
            Image("Logo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 64, height: 64)
                .cornerRadius(26)
            Text("이체 계좌 촬영")
                .font(.headline)
                .foregroundColor(.white)
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
                  Image("Logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
                    .cornerRadius(10)
                  Text("촬영").font(.caption).bold()
                    .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(widgetAccent)
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
                        Text(formatAccountByBank(a.accountNumber, bankCode: a.bankCode))
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
                    Image("Logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 40, height: 40)
                        .cornerRadius(10)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("이체 계좌 촬영")
                            .font(.subheadline).bold()
                            .foregroundColor(.white)
                        Text("이체할 계좌를 사진으로 인식")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.75))
                    }
                    Spacer()
                }
                .padding(12)
                .background(widgetAccent)
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
                                Text("\(a.bankName) · \(formatAccountByBank(a.accountNumber, bankCode: a.bankCode))")
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
                    .containerBackground(for: .widget) {
                        WidgetContainerBackground()
                    }
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
