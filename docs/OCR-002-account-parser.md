# OCR-002 계좌번호/은행명 파싱 로직

## 문서 정보
- ID: OCR-002
- 생성일: 2026-05-28
- 참조문서: [OCR-001 CLOVA OCR API 연동](OCR-001-clova-integration.md), [DAT-001 Account 데이터 모델](DAT-001-account-model.md)
- 관계: 의존

## 목적

CLOVA OCR이 반환한 텍스트 배열에서 (1) 계좌번호 (2) 은행명 (3) 가능하면 예금주명을 식별·정규화.

## 입력

[[OCR-001]]의 `OcrResult` — 각 텍스트 박스의 `inferText`, `boundingPoly`(좌표), `inferConfidence`.

## 출력

```ts
type ParsedAccount = {
  accountNumber: string;   // 정규화 (하이픈/공백 제거, 숫자만)
  bankName: string;        // 표준 은행명 (예: "국민은행")
  bankCode?: string;       // 은행 코드 (있으면)
  holderName?: string;
  confidence: number;      // 0~1 종합 신뢰도
  candidates?: ParsedAccount[]; // 여러 후보가 나온 경우 (사용자 선택)
};
```

## 파싱 단계

### 1. 계좌번호 후보 추출

- 정규식: `/\d[\d\-\s]{9,}\d/` (숫자 10자리 이상, 하이픈/공백 허용)
- 후보별로 하이픈/공백 제거 후 길이 검증 (11~16자리 일반적)
- 너무 긴 숫자열은 전화번호 가능성 → 길이 11 + 010/011 등으로 시작하면 제외

### 2. 은행명 식별

- 사전 정의 은행명 리스트 매칭 (정확/부분 일치)
- 한글 표준명 + 영문 약어 + 흔한 오타 패턴 (예: "국민" / "KB" / "kookmin")
- 매칭된 은행 → 표준명 + bankCode 매핑

```ts
const BANKS = [
  { code: '004', names: ['국민은행', 'KB', '국민'] },
  { code: '088', names: ['신한은행', '신한'] },
  { code: '020', names: ['우리은행', '우리'] },
  { code: '081', names: ['하나은행', '하나'] },
  // ... 카카오뱅크, 토스뱅크, IBK, NH, SC, 우체국 등
];
```

### 3. 예금주명 추출 (옵션)

- "예금주" 단어 근처 텍스트 박스 (boundingPoly 좌표 기준)
- 한글 2~4자 + 영문 1~30자

### 4. 신뢰도 계산

- 계좌번호 매칭 confidence (CLOVA inferConfidence 평균)
- 은행명 매칭 확실성 (정확 1.0, 부분 0.7, 추정 0.4)
- 종합 가중 평균

## 엣지 케이스

- 한 이미지에 계좌 여러 개 → `candidates`로 다 반환, UI에서 선택
- 은행명 못 찾으면 → `bankName: ''` + UI에서 사용자 선택 드롭다운
- 계좌번호만 있고 은행명 없음 → 일부 은행은 계좌 prefix로 추정 가능 (정확도 낮음, 보조용)

## 검증 항목

- [ ] 다양한 은행 손글씨 샘플 10장 테스트 → 정확도 측정
- [ ] 프린트물 샘플 5장 → 정확도 측정
- [ ] 예금주명 추출 동작 확인
- [ ] 계좌 여러 개 케이스 처리
