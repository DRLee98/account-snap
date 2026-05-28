# WGT-001 RN ↔ 네이티브 데이터 공유 인프라

## 문서 정보
- ID: WGT-001
- 생성일: 2026-05-28
- 참조문서: [DAT-001 Account 데이터 모델](DAT-001-account-model.md), [DAT-002 로컬 DB](DAT-002-local-db.md)
- 관계: 의존

## 목적

RN 앱과 네이티브 위젯이 **같은 데이터 저장소**를 보도록 인프라 구축. 위젯은 별도 프로세스에서 동작하므로 단순한 in-memory 공유가 불가능.

## PoC 결과 (2026-05-28)

### 검증된 사항 ✅
1. iOS Widget Extension target 추가 및 빌드 OK
2. App Group capability(`group.kr.account-snap`) — 메인 앱 + 위젯 양쪽 entitlements 설정
3. App Group container path 시뮬레이터에서 정상 인식 (`/Users/.../CoreSimulator/Devices/.../AppGroup/.../`)
4. RN `NativeModules.AppGroup.containerPath` (constants)는 New Arch에서도 정상 노출
5. RN 측 MMKV 영속화 OK (default sandbox, 위젯과 공유 아님)

### 학습된 제약 ⚠️
1. **MMKV는 iOS App Extension(위젯)에서 사용 불가** — `UIApplication.sharedApplication` 호출 때문에 컴파일 실패. 위젯 측 storage는 **NSUserDefaults App Group**으로 결정.
2. **RN 0.85 New Architecture(Bridgeless)에서 `RCT_EXTERN_METHOD` 미지원** — method 호출 시 `undefined is not a function`. 해결책은 TurboModule spec(Codegen) 작성 → [[WGT-005]]로 분리.
3. **Xcode 26.5의 `objectVersion=70`을 cocoapods 1.16.2가 인식 못 함** — `pod install` 전 56으로 수동 다운그레이드 필요 (Xcode가 다시 70으로 올릴 수 있음).
4. **Metro 포트 충돌**: 다른 RN 프로젝트(jangboo-rn-monorepo)가 8081 점거 중이라 AccountSnap은 8082 사용. `AppDelegate.swift`의 `bundleURL`에 직접 URL 명시 (`http://localhost:8082/...`).

## 최종 데이터 공유 전략

### RN 측 (메인 앱)
- 일반 데이터: react-native-mmkv 3.x (default sandbox, App Group path 옵션은 사용 안 함)
- 위젯과 공유할 데이터: **NSUserDefaults App Group**에 mirror write
  - RN → Native method 호출은 [[WGT-005]] TurboModule spec 통해

### 위젯 측
- `UserDefaults(suiteName: "group.kr.account-snap")`로 읽기/쓰기

### Android (WGT-003에서 적용 예정)
- 같은 앱 패키지라 SharedPreferences 또는 MMKV 직접 공유 가능 (iOS와 다른 제약)

## iOS App Group 설정

1. Xcode → AccountSnap target → Signing & Capabilities → + Capability → App Groups
2. ID: `group.kr.account-snap`
3. AccountSnapWidgetExtension target에도 동일 capability 추가
4. 결과: `AccountSnap.entitlements`, `AccountSnapWidgetExtension.entitlements` 양쪽에 group 등록

## Android: 공용 SharedPreferences

Android는 위젯이 메인 앱과 같은 프로세스에서 동작. 전략:
- **전략 A (간단)**: MMKV 파일 또는 SharedPreferences를 같은 앱 패키지라 직접 읽기 (Android는 App Extension 제약 없음)
- **전략 B**: ContentProvider로 명시 노출

→ MVP는 A. [[WGT-003]]에서 구체화.

## 위젯 갱신 트리거 (RN → Native)

`WidgetBridge.reload()` — [[WGT-005]] TurboModule로 구현 예정.

- iOS: `WidgetCenter.shared.reloadAllTimelines()`
- Android: `AccountWidget.updateAll(context)`

## PoC 우선순위 (완료)

1. ✅ iOS App Group + Widget Extension target 추가 + capability 설정
2. ✅ AppGroup native module로 container path 노출 (constants OK)
3. ✅ MMKV → App Extension 호환성 검증 (불가 판정 → NSUserDefaults 전략)
4. ⏭️ RN→Native method 호출 (TurboModule spec) → [[WGT-005]]
5. ⏭️ Android 동일 검증 → [[WGT-003]]에서 진행

## 검증 항목

- [x] iOS Widget Extension target 빌드 통과
- [x] App Group container path 양쪽 인식
- [x] AppGroup constants RN 측에서 접근
- [ ] (WGT-005) RN→Native method 호출 동작
- [ ] (WGT-003) Android 동일 인프라 검증
- [ ] (전체 완료 후) 시뮬레이터에서 위젯 추가 → 메인 앱 데이터 변경 → 위젯 즉시 갱신
