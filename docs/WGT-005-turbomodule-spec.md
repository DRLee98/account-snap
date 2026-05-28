# WGT-005 TurboModule spec (AppGroup / WidgetBridge)

## 문서 정보
- ID: WGT-005
- 생성일: 2026-05-28
- 참조문서: [WGT-001 RN ↔ 네이티브 데이터 공유 인프라](WGT-001-native-bridge.md)
- 관계: 의존

## 배경

WGT-001 PoC 결과, RN 0.85의 New Architecture(Bridgeless mode)에서 `RCT_EXTERN_METHOD`로 노출한 native module method가 호출되지 않음 (`undefined is not a function`). 단 `constantsToExport`로 노출한 값은 정상 접근 (App Group `containerPath` 인식 OK).

→ Method 호출이 필요한 모든 RN↔Native 통신은 **TurboModule spec** (Codegen 기반)으로 작성해야 함.

## 대상 모듈

### 1. AppGroup
- `setString(key: string, value: string): void`
- `getString(key: string): Promise<string | null>`
- `remove(key: string): void`
- `getConstants(): { containerPath: string; suiteName: string }`

### 2. WidgetBridge
- `reload(): void` — iOS `WidgetCenter.shared.reloadAllTimelines()` / Android `AppWidget.updateAll(context)` 호출

## 작업 단계

### 1. TypeScript spec 작성

```
src/specs/
  ├─ NativeAppGroup.ts
  └─ NativeWidgetBridge.ts
```

```ts
// NativeAppGroup.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): { containerPath: string; suiteName: string };
  setString(key: string, value: string): void;
  getString(key: string): Promise<string | null>;
  remove(key: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AppGroup');
```

### 2. package.json에 codegenConfig 추가

```json
"codegenConfig": {
  "name": "AccountSnapSpecs",
  "type": "modules",
  "jsSrcsDir": "src/specs",
  "android": {
    "javaPackageName": "kr.accountsnap.specs"
  }
}
```

### 3. iOS 구현 변경

기존 `RCT_EXTERN_MODULE`/`RCT_EXTERN_METHOD` 제거하고, Codegen이 생성한 protocol을 Swift 클래스가 채택:

```swift
@objc(AppGroup)
class AppGroup: NSObject, NativeAppGroupSpec {  // generated protocol
  func setString(_ key: String, value: String) { ... }
  func getString(_ key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) { ... }
  // ...
}
```

### 4. Android 구현 (WGT-003에서)

Java/Kotlin TurboModule 구현. Glance 위젯과 동일 패키지.

### 5. 통합

- `pod install` → Codegen 자동 실행 → protocol 생성
- RN 코드에서 `import AppGroup from './src/specs/NativeAppGroup'`로 사용

## 검증 항목

- [ ] iOS에서 `AppGroup.setString` 호출 → 즉시 NSUserDefaults App Group에 저장
- [ ] 위젯에서 같은 키로 읽기 → 동일 값 확인
- [ ] `WidgetBridge.reload()` 호출 → 위젯 UI 즉시 갱신
- [ ] Android에서 동일 동작
