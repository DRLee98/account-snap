# DAT-004 백업 내보내기/가져오기

## 문서 정보
- ID: DAT-004
- 생성일: 2026-08-18
- 참조문서: [DAT-001 Account 데이터 모델](DAT-001-account-model.md), [DAT-003 클라우드 동기화 설계](DAT-003-cloud-sync.md)
- 관계: 선행 (DAT-003 풀 동기화 전의 가벼운 단계)

## 목적

기기 변경/분실 시 데이터 전손을 막는다. 서버 없이 동작하는 JSON
내보내기/가져오기 — 백업 포맷이 그대로 DAT-003 동기화 포맷의 기반이 된다.

## 포맷 (v1)

```json
{
  "app": "account-snap",
  "version": 1,
  "exportedAt": 1755500000000,
  "accounts": [ { ...Account, 이미지 URI 제외 } ]
}
```

- `sourceImageUri`/`originalImageUri`는 기기 로컬 경로라 제외
- 삭제된 계좌(deletedAt≠null)는 내보내기에서 제외 (live만)

## UX

계좌 목록 헤더의 아카이브 아이콘 → Alert 메뉴:

- **내보내기 (공유)**: `Share.share({ message: json })` — 메모/카톡 나에게 보내기/
  파일 앱 등 원하는 곳에 보관. 추가 네이티브 의존성 없음.
- **가져오기 (클립보드에서)**: 백업 텍스트를 복사해둔 상태에서 실행 →
  개수 확인 Alert → 병합 → 결과 요약 (추가/갱신/건너뜀)

## 병합 규칙 (`mergeBackupAccounts`, 순수 함수)

1. 같은 `id` → `updatedAt` 최신 쪽이 이김 (기존 이미지 URI는 유지)
2. `id` 다르지만 살아있는 같은 계좌번호 → 중복으로 건너뜀
3. 그 외 → 추가

## 검증 (`parseBackup`)

- JSON 파싱 실패 / `app` 불일치 / 미래 버전 → 한국어 에러 메시지로 throw
- 항목 단위 오류는 걸러내고, 유효 항목 0개면 throw
- 계좌번호는 normalize (하이픈 제거)

## 구현

- `src/services/backup.ts` — 직렬화/검증/병합 (스토리지 의존성 없는 순수 로직)
- `accountRepository.importAccounts()` — 병합 결과 저장 + 위젯 동기화
- `src/screens/AccountListScreen.tsx` — 헤더 메뉴 UI
- 테스트: `__tests__/backup.test.ts`

## 남은 것 (DAT-003으로 이어짐)

- 파일 단위 내보내기 (iCloud/Drive 문서 피커) — 네이티브 의존성 추가 필요
- 자동 주기 백업, 클라우드 동기화
