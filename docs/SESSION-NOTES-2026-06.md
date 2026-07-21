# 2026-06 작업 노트

App Store 출시 직전 ~ 1.0.x 사이클에서 진행한 작업 요약.

## 1. AdFit 네이티브 배너 광고 통합 (iOS)

### 구조
- `ios/AccountSnap/AdFitBannerWrapper.swift` — `AdFitBannerAdView` 래핑 UIView. props: clientId, adWidth, adHeight, cornerRadius
- `ios/AccountSnap/AdFitBannerViewManager.mm` — RCTViewManager (Bridgeless interop으로 동작)
- `src/components/AdFitBanner.tsx` — `requireNativeComponent('AdFitBannerView')` 호출

### 핵심 포인트
- AdFitSDK 3.18.3 (CocoaPods `pod 'AdFitSDK'`)
- `AdFitBannerAdView(clientId:, adUnitSize:)` 형식으로 사이즈 명시 — 비표준 사이즈(320x100) fill 위해 필요
- `rootViewController` 세팅 필수
- WebView 방식은 모바일 앱 매체 등록된 광고 단위와 호환 불가 (도메인 매체 X) → native SDK 필수

### 배치
- 카메라 화면 상단 320x50
- 결과 화면 하단 320x100

### IDFA / ATT 컴플라이언스
- `Info.plist`: `NSUserTrackingUsageDescription`, `SKAdNetworkItems` (Kakao `nbf5x3v3vp.skadnetwork`)
- `AppDelegate.swift`: 앱 시작 1초 뒤 `ATTrackingManager.requestTrackingAuthorization`
- `docs/privacy.md`: AdFit / IDFA 사용 명시

## 2. OCR 보안 — Proxy 모드 준비

`src/services/ocr/clovaClient.ts`:
- `OCR_PROXY_URL` env 설정 시 자체 proxy로 호출 (CLOVA secret 노출 없음)
- 미설정 시 NCP CLOVA OCR 직접 호출 (현재 출시 빌드)
- Cloudflare Workers proxy 배포는 출시 후 진행 예정

NCP 측 방어:
- Billing 알림 (5,000원)
- API Gateway throttling (분당 60req)

## 3. 결과 화면 / 편집 분리

### Result 화면 (`src/screens/ResultScreen.tsx`)
- OCR 직후 표시 — 원본 사진, 토스 송금, 광고 포함
- **영역 다시 칠하기** 버튼: brush 인식 잘못된 경우 `originalImageUri`로 Crop 화면 재진입
  - `Account.originalImageUri` 필드 추가 (brush 자르기 전 원본 사진 URI)
  - 클릭 시 현재 계좌 삭제 + `navigation.replace('Crop', { sourceUri })`

### Edit 화면 (`src/screens/EditScreen.tsx`)
- 별도 라우트 — 사진/송금/광고 없이 필드 편집만
- AccountList 스와이프 → 수정에서 진입

### 은행 선택기 (`src/components/BankPicker.tsx`)
- 14개 은행 바텀시트 + "직접 입력" 모드
- `KeyboardAvoidingView`로 인풋 가려짐 방지
- EditScreen에서 사용 (은행 필드 탭 → 모달)

## 4. 계좌 목록 — 스와이프 액션

### `src/components/SwipeableListItem.tsx`
RN-only 구현 (reanimated 의존성 없음):
- `Gesture.Pan().activeOffsetX([-30, 30])` — 가로 30px 임계 넘기 전엔 부모(ScrollView/FlatList) 양보
- `Gesture.Tap().maxDistance(8)` — Race로 합성. 좌표 8px 이내 떨어진 진짜 탭만 onPress fire (스와이프 시 오발 방지)
- `Animated.Value` + `Animated.spring` — RN 기본 Animated API

### 적용
- 좌측 스와이프 → 우측 `삭제`
- 우측 스와이프 → 좌측 `수정`
- 탭 → 복사 (좌표 이동 8px 이내)

### Toast 개선
- `Toast.show({ swipeable: true })` + 루트 `<Toast swipeable />` — 위로 스와이프하면 dismiss

## 5. 위젯 카메라 진입 시 스택 리셋

`AppNavigator.tsx`:
- `handleCameraDeepLink` — `accountsnap://camera` URL 받으면 `CommonActions.reset` 으로 Camera 단일 스택으로 리셋
- 이전 화면(목록 모달 등)이 위에 남아있는 문제 해결

## 6. 스크린샷 합성 스크립트

`scripts/build-screenshots.js`:
- iPhone 6.9" (1320×2868) + iPad 13" (2064×2752) 두 타겟
- 그라데이션 배경 + 헤드라인/서브 카피 + brand watermark + 스크린샷 둥근 모서리 마스킹
- `screenshots/raw/01.png ~ 06.png` 입력 → `screenshots/output/{iphone,ipad}/` 출력

`scripts/capture-screenshot.sh`:
- 연결된 iPhone에서 다음 빈 번호로 자동 캡쳐 (`xcrun devicectl ... screenshot`)

## 7. 출시 준비

### 버전
현재: 1.0.2 / build 7 (메인 앱 + 위젯 extension 동기화)

### Info.plist 출시 관련 키
- `ITSAppUsesNonExemptEncryption = false` (export compliance 자동 처리)
- `NSUserTrackingUsageDescription` (ATT)
- `SKAdNetworkItems` (AdFit)
- `LSApplicationQueriesSchemes`: `supertoss` (canOpenURL용)
- `CFBundleDisplayName`: 스냅넘버

### Archive / Export
- `ios/ExportOptions.plist` — method=app-store-connect, signingStyle=automatic
- 자동 export 시 distribution cert 키체인에 없으면 실패 → Xcode Organizer로 업로드 권장

## 시도했으나 폐기된 접근

### Reanimated 4.x + RN 0.85 Bridgeless
- `Runtime not ready cannot read property 'code' of undefined` 에러 지속
- 번들은 worklets 정상 transform, native 측 init 타이밍 문제로 추정
- 대안으로 **gesture-handler + RN 기본 Animated** 조합으로 우회

### @gorhom/bottom-sheet
- 위와 동일 reanimated 의존성 → 동일 에러
- AccountList 모달 → 일반 push 화면으로 단순화

### WebView 기반 AdFit 광고
- 모바일 앱 매체 등록된 광고 단위는 도메인 검증 통과 불가 → fill 0
- 네이티브 SDK 필수

## 환경변수 (.env)

```env
CLOVA_INVOKE_URL=...
CLOVA_SECRET_KEY=...
# 출시 후 proxy 마이그레이션 대비
# OCR_PROXY_URL=
# OCR_PROXY_TOKEN=

ADFIT_IOS_CLIENT_ID=DAN-K53915gbmFyKDqey       # 카메라 320x50
ADFIT_IOS_RESULT_CLIENT_ID=DAN-bM7yF21Ny3cnyEcB # 결과 320x100
ADFIT_ANDROID_CLIENT_ID=
```

## App Store Connect 설정 (수동)

- App Privacy: Device ID (Third-Party Advertising / Tracking) + Product Interaction + Crash/Performance Data
- IDFA 사용: Yes — Serve advertisements within the app
- 배포 정보 → 광고 포함: Yes
- 매번 빌드 제출 시 위 답변 자동 적용됨
