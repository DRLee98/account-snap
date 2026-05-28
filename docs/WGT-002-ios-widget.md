# WGT-002 iOS 위젯 (WidgetKit)

## 문서 정보
- ID: WGT-002
- 생성일: 2026-05-28
- 참조문서: [WGT-001 RN ↔ 네이티브 데이터 공유 인프라](WGT-001-native-bridge.md), [WGT-004 위젯 액션](WGT-004-widget-actions.md)
- 관계: 의존

## 목적

iOS 홈/잠금 화면에 표시될 WidgetKit 위젯 구현. SwiftUI 기반.

## 익스텐션 구조

- Xcode에서 새 Widget Extension 추가 → `AccountSnapWidget`
- App Group capability 동일하게 추가 ([[WGT-001]])
- MMKV Swift SDK Pod 추가

## 위젯 종류 (3가지 family)

### `.systemSmall` — "최근 계좌 + 카메라"
```
┌──────────────┐
│ 본가 김치 계좌│  ← label (없으면 은행명)
│ 국민          │
│ 110-1234-... │  ← 계좌번호 일부
│              │
│ [📷 촬영]    │  ← deep link 버튼
└──────────────┘
```
- 위젯 전체 탭 → 계좌번호 복사 ([[WGT-004]])
- 카메라 버튼 탭 → 앱 카메라 화면 deep link

### `.systemMedium` — "즐겨찾기 3개"
```
┌────────────────────────────┐
│ 본가 김치   국민  110-12...📋│
│ 우리 가게   신한  110-98...📋│
│ 사장님 폰   카뱅  3333-...📋 │
└────────────────────────────┘
```
- 각 줄 탭 → 해당 계좌 복사

### `.systemLarge` — "즐겨찾기 6~8개 + 카메라 FAB"

## 데이터 로딩

- `TimelineProvider`에서 MMKV에서 `accounts:list` 읽기
- `isFavorite: true` 필터 + `lastUsedAt desc` 정렬
- `accounts:lastUsedId`로 small 위젯의 최근 계좌 식별

## 타임라인 정책

- 데이터 변경 트리거 기반 (`WidgetCenter.reloadAllTimelines()`) — 자동 주기 갱신 불필요
- `.never` policy로 placeholder만 첫 진입 시 제공

## 검증 항목

- [ ] 3가지 family 모두 UI 정상 표시
- [ ] 데이터 0건 placeholder 동작
- [ ] 데이터 변경 후 [[WGT-001]]의 reloadWidgets 호출 → 위젯 즉시 갱신
- [ ] Deep link 액션 정상 동작
