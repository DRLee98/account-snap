# WGT-003 Android 위젯 (Glance)

## 문서 정보
- ID: WGT-003
- 생성일: 2026-05-28
- 참조문서: [WGT-001 RN ↔ 네이티브 데이터 공유 인프라](WGT-001-native-bridge.md), [WGT-004 위젯 액션](WGT-004-widget-actions.md)
- 관계: 의존

## 목적

Android 홈 화면 위젯 구현. **Jetpack Glance** (Compose 기반) 사용 — 기존 RemoteViews 대비 선언적이고 [[WGT-002]] SwiftUI와 멘탈 모델 동일.

## 의존성

```gradle
implementation "androidx.glance:glance-appwidget:<latest>"
implementation "androidx.glance:glance-material3:<latest>"
implementation "com.tencent:mmkv:<latest>"
```

## 위젯 구조

- `AccountWidget : GlanceAppWidget` — UI 정의
- `AccountWidgetReceiver : GlanceAppWidgetReceiver` — Manifest 등록
- `widget_info.xml` (res/xml/) — 크기 메타데이터

## 크기 대응

Glance는 [[WGT-002]]의 family와 달리 자유 사이즈. `LocalSize.current` 로 분기:

| 가로 (cells) | 모드 |
|--------------|------|
| 1×1 ~ 2×2 | 최근 계좌 1개 + 카메라 |
| 3×2 ~ 4×2 | 즐겨찾기 3개 |
| 4×4+ | 즐겨찾기 6~8개 + 카메라 FAB |

## 데이터 로딩

- MMKV로 `accounts:list` 읽기 ([[WGT-001]])
- `provideGlance` 내에서 동기적으로 읽고 Composable에 전달

## 액션

- `actionStartActivity` — 카메라 deep link
- `actionRunCallback` — 계좌번호 클립보드 복사 ([[WGT-004]])

## 갱신 트리거

- RN → Native `WidgetBridge.reload()` → `AccountWidget.updateAll(context)` 호출

## 검증 항목

- [ ] 3가지 사이즈 UI 정상 표시 (1×1, 3×2, 4×4)
- [ ] 위젯 추가 후 데이터 표시 정상
- [ ] 데이터 변경 시 위젯 즉시 갱신
- [ ] 클립보드 복사 액션 동작
- [ ] 카메라 deep link 동작
