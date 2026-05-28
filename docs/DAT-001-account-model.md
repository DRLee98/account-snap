# DAT-001 Account 데이터 모델 정의

## 문서 정보
- ID: DAT-001
- 생성일: 2026-05-28
- 참조문서: 없음
- 관계: -

## 목적

OCR로 추출한 계좌 정보를 표현하는 핵심 엔티티 정의. 처음부터 클라우드 동기화 가능한 구조로 설계하여 추후 [[DAT-003]] 구현 시 스키마 변경 없이 확장.

## Account 엔티티

```ts
type Account = {
  // 식별/동기화
  id: string;            // UUID v4 (디바이스에서 생성)
  createdAt: number;     // epoch ms
  updatedAt: number;     // epoch ms — sync 충돌 해결용
  deletedAt: number | null; // soft delete (sync용)

  // 핵심 데이터
  accountNumber: string; // 하이픈 제거된 정규화 값 (예: "11012345678901")
  bankName: string;      // 정규화된 은행명 (예: "국민은행")
  bankCode?: string;     // 은행 코드 (옵션, 추후 송금 연동용)
  holderName?: string;   // 예금주명 (OCR로 잡힌 경우)

  // 사용자 메타데이터
  label?: string;        // 사용자가 붙인 별칭 (예: "본가 김치 계좌")
  isFavorite: boolean;   // 즐겨찾기 여부
  lastUsedAt?: number;   // 마지막 복사/사용 시각 — 위젯 "최근 1개" 표시 기준

  // 원본 추적
  sourceImageUri?: string; // 로컬 원본 이미지 경로 (옵션)
  ocrRawText?: string;     // OCR 원문 (디버깅/재파싱용)
};
```

## 설계 결정

- **id는 클라이언트 UUID**: 오프라인에서 생성 가능. 서버 생성 ID에 의존하지 않음.
- **updatedAt 기반 last-write-wins**: 초기 동기화 충돌 정책은 단순하게. 동시 편집이 드문 단일 사용자 시나리오라 충분.
- **deletedAt soft delete**: 위젯/다른 디바이스 캐시와의 정합성을 위해 hard delete 금지.
- **accountNumber 정규화 저장**: 입력 시점에 하이픈/공백 제거. 표시 시점에 포맷팅. → [[OCR-002]] 파서가 정규화 책임.
- **lastUsedAt**: 위젯의 "최근 추출 계좌" 표시 기준. 단순 createdAt이 아닌 이유는 사용자가 옛 계좌를 다시 쓸 수 있어서.

## 검증 항목

- [ ] 모든 필드의 nullability가 명확한가
- [ ] 동기화에 필요한 메타데이터(updatedAt, deletedAt)가 누락 없는가
- [ ] 위젯이 필요로 하는 정보(bankName, accountNumber, label)가 모두 포함되는가
