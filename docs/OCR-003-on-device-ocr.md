# OCR-003 온디바이스 OCR + CLOVA 폴백

## 문서 정보
- ID: OCR-003
- 생성일: 2026-08-18
- 참조문서: [OCR-001 CLOVA OCR API 연동](OCR-001-clova-integration.md), [OCR-002 파싱 로직](OCR-002-account-parser.md), [WGT-005 TurboModule 스펙](WGT-005-turbomodule-spec.md)
- 관계: 의존

## 목적

CLOVA OCR 호출 비용 절감 + 오프라인 동작 + 이미지 외부 전송 최소화.
1차로 기기 내 OCR을 돌리고, 계좌번호를 못 찾거나 신뢰도가 낮을 때만 CLOVA 폴백.

## 인식 플로우 (`recognizeAccount`)

```
이미지 → 온디바이스 OCR → parseAccountFromText
  ├─ 계좌 발견 & confidence ≥ 0.4 → 사용 (source: 'device')
  └─ 미검출/저신뢰 → CLOVA 호출 → parseAccount
       ├─ 성공 → 사용 (source: 'clova')
       └─ CLOVA 실패 시: 온디바이스 저신뢰 결과라도 있으면 그걸 반환
          (사용자가 결과 화면에서 수정 가능), 없으면 throw
```

- `.env`의 `OCR_FORCE_CLOVA=true`로 온디바이스를 끌 수 있음 (디버깅/품질 비교용)
- 네이티브 모듈 미탑재(빌드 전) 환경에서도 JS는 그대로 CLOVA로 동작
  (`TurboModuleRegistry.get` — getEnforcing 아님)

## TurboModule: `TextRecognition`

- 스펙: `src/specs/NativeTextRecognition.ts`
  - `recognize(imageUri): Promise<{ text: string; confidence: number }>`
- iOS: `ios/AccountSnap/TextRecognition.mm` + `TextRecognitionHelper.swift`
  - Vision `VNRecognizeTextRequest`, accurate, 언어 교정 off (숫자 왜곡 방지)
  - 한국어는 iOS 16+ (Revision 3). 이하 버전은 영문/숫자만 → 자연스럽게 CLOVA 폴백
  - Xcode 프로젝트(pbxproj)에 두 파일 등록 완료
- Android: `TextRecognitionModule.kt`
  - ML Kit `text-recognition-korean:16.0.1` (모델 번들, 오프라인)
  - 라인 confidence 평균 (미제공 라인 제외, 없으면 0.85 기본값)
  - `AppPackage.kt`에 등록

## 검증

- `npx react-native codegen`으로 스펙 파싱/생성 확인
  (`NativeTextRecognitionSpec.java`의 `recognize(String, Promise)` — Kotlin 구현과 일치)
- 실기기 검증 필요: iOS pod install 후 빌드, Android gradle sync 후 빌드

## 참고

- CropScreen `runOCR`이 `recognize + parseAccount` 대신 `recognizeAccount` 사용
- `ocrRawText`에는 실제 사용된 소스(디바이스 or CLOVA)의 텍스트가 저장됨
