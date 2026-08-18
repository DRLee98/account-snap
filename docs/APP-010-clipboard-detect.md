# APP-010 클립보드 계좌 인식

## 문서 정보
- ID: APP-010
- 생성일: 2026-08-18
- 참조문서: [OCR-002 계좌번호/은행명 파싱 로직](OCR-002-account-parser.md)
- 관계: 의존 (텍스트 파서 공유)

## 목적

카톡 등으로 텍스트로 받은 계좌번호("우리 1002-123-456789 홍길동")를
사진 촬영 없이 저장할 수 있게 한다. OCR API 호출이 없으므로 비용 0.

## 동작

1. 앱 시작 시 + 백그라운드 → 포그라운드 전환 시 클립보드 텍스트 확인
2. `parseAccountFromText()`로 계좌번호/은행/예금주 파싱
   - OCR-002의 파싱 로직을 `src/services/ocr/textParser.ts`로 분리해 공유
   - clovaParser는 CLOVA 응답을 텍스트로 합친 뒤 같은 파서에 위임
3. 감지되면 Alert: "클립보드에 계좌번호가 있어요 — 무시 / 저장"
   - 저장 → 계좌 생성 후 Edit 화면으로 이동 (검토/수정)
   - 무시하든 저장하든 같은 번호로는 다시 묻지 않음 (MMKV `clipboard:lastSeenNumber`)

## 스팸 방지 규칙 (`shouldPromptClipboardAccount`)

- 이미 처리한 번호(lastSeen)면 스킵
- 이미 저장된 계좌번호면 스킵 — 앱이 스스로 복사한 번호(목록 탭, 위젯 딥링크)가
  다시 프롬프트를 띄우는 루프를 이 규칙이 막는다
- 2,000자 초과 텍스트는 파싱하지 않음

## 구현

- `src/services/ocr/textParser.ts` — 순수 텍스트 파서 (클립보드는 baseConfidence=1)
- `src/services/clipboardAccount.ts` — 감지/판단/lastSeen 기록
- `App.tsx` — AppState 리스너 + Alert UI
- 테스트: `__tests__/textParser.test.ts`

## 알려진 제약

- iOS 14+에서는 클립보드를 읽을 때 시스템 붙여넣기 배너가 표시됨 (정상 동작)
- 클립보드 접근 실패는 조용히 무시 (best-effort)
