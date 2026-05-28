# WGT-004 위젯 액션 (딥링크, 클립보드 복사)

## 문서 정보
- ID: WGT-004
- 생성일: 2026-05-28
- 참조문서: [WGT-002 iOS 위젯](WGT-002-ios-widget.md), [WGT-003 Android 위젯](WGT-003-android-widget.md)
- 관계: 의존

## 액션 1: 카메라 바로 실행 (deep link)

### URL 스킴
- `accountsnap://camera`

### iOS
- `Link(destination: URL(string: "accountsnap://camera")!)` — WidgetKit에서 deep link 표준
- Info.plist `CFBundleURLSchemes`에 `accountsnap` 등록
- AppDelegate / SceneDelegate에서 URL handling → React Navigation initial route

### Android
- `actionStartActivity(Intent(Intent.ACTION_VIEW, Uri.parse("accountsnap://camera")))`
- AndroidManifest `<intent-filter>`에 스킴 등록
- RN 측 `Linking` listener로 라우팅

### RN 측 처리
- `Linking.getInitialURL()` / `Linking.addEventListener('url', ...)`
- `accountsnap://camera` → `navigation.navigate('Camera')`

## 액션 2: 계좌번호 클립보드 복사

### iOS (iOS 17+)
- `Button(intent: CopyAccountIntent(accountId: ...))` — App Intent 사용
- `CopyAccountIntent`에서 MMKV로 계좌 조회 → `UIPasteboard.general.string` 설정
- 위젯 익스텐션 자체에서 처리 (앱 실행 없음, UX 매우 빠름)
- iOS 16 이하 fallback → deep link `accountsnap://copy?id=...`로 앱 띄워 처리

### Android
- `actionRunCallback<CopyAccountCallback>(actionParametersOf(accountIdKey to id))`
- `CopyAccountCallback.onAction()`에서 ClipboardManager에 set
- `Toast.makeText(ctx, "복사됨", SHORT).show()` 피드백

### 공통 후처리
- 복사 후 MMKV `accounts:lastUsedId` + `account.lastUsedAt` 갱신
- 위젯 자체 reload (다음 표시 시 최신 반영)

## 검증 항목

- [ ] iOS 위젯 카메라 버튼 → 앱 카메라 화면 진입
- [ ] Android 위젯 카메라 버튼 → 앱 카메라 화면 진입
- [ ] iOS 17+ 위젯 계좌 탭 → 앱 안 띄우고 즉시 복사
- [ ] iOS 16 위젯 fallback 동작
- [ ] Android 위젯 계좌 탭 → 즉시 복사 + 토스트
- [ ] 복사 후 lastUsedAt 갱신 확인
