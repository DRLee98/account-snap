# OCR-003 온디바이스 OCR (CLOVA 실패 시 폴백)

## 문서 정보
- ID: OCR-003
- 생성일: 2026-08-18
- 참조문서: [OCR-001 CLOVA OCR API 연동](OCR-001-clova-integration.md), [OCR-002 파싱 로직](OCR-002-account-parser.md), [WGT-005 TurboModule 스펙](WGT-005-turbomodule-spec.md)
- 관계: 의존

## 목적

CLOVA OCR을 쓸 수 없을 때(오프라인·네트워크 오류)의 대체 인식 경로.

> 처음(2026-08)에는 비용 절감을 위해 **기기 내 OCR 우선 → CLOVA 폴백** 구조였으나,
> 2026-11-18 **CLOVA 우선**으로 되돌렸다. 아래 "수정 이력" 참고.

## 인식 플로우 (`recognizeAccount`)

```
이미지 → CLOVA 호출 → parseAccount
  ├─ 계좌 발견 → 사용 (source: 'clova')
  ├─ 정상 응답인데 계좌 없음 → null (기기 내 OCR로 넘기지 않음)
  └─ 호출 실패(네트워크 등) → 온디바이스 OCR → parseAccountFromText
       ├─ 계좌 발견 → 사용 (source: 'device')
       └─ 없음 → CLOVA 오류 throw
```

- 네이티브 모듈 미탑재(빌드 전) 환경에서는 폴백 없이 CLOVA만 동작
  (`TurboModuleRegistry.get` — getEnforcing 아님)

## TurboModule: `TextRecognition`

- 스펙: `src/specs/NativeTextRecognition.ts`
  - `recognize(imageUri): Promise<{ text; confidence; blocks: { text; confidence; x; y; width; height }[] }>`
  - `blocks`: 관측/라인 단위 좌표 (iOS 정규화·좌상단 원점, Android 픽셀). 엔진 순서는
    읽기 순서를 보장하지 않으므로 `deviceClient`가 `readingOrder.ts`로 재정렬한 뒤 이어붙인다
    (OCR-002 2026-10-16 수정 이력 참고)
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

## 수정 이력

### 2026-11-18 — CLOVA 우선으로 전환

1.1.0의 기기 내 OCR(iOS Vision)이 좁은 세로 글씨체 간판 `301-2468-1357-02`를
`301-24618-35-12`로 읽었는데, 엔진 신뢰도가 높게 나와 CLOVA 폴백이 안 됐다.
같은 간판을 CLOVA로 찍은 기록 4건은 모두 정확했다. 계좌번호 오인식은 잘못된 송금으로
이어질 수 있어 치명적이고, 사용자 수가 적어 CLOVA 비용 부담은 작다고 판단해 순서를 바꿨다.

- 은행 형식 검증(`formatMismatch`, OCR-002)은 남겨둠 — 의심 결과 표시용
- `OCR_FORCE_CLOVA` env 제거 (CLOVA가 기본이 되어 의미 없음)
- 개인정보처리방침 2-1을 CLOVA 전송 기본 + 실패 시 기기 내 인식으로 수정
- `ocrRawText`도 CLOVA 필드를 읽기 순서로 정렬한 텍스트로 저장 (기존엔 정렬 전 텍스트)
