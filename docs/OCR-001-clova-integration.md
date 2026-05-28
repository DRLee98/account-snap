# OCR-001 CLOVA OCR API 연동

## 문서 정보
- ID: OCR-001
- 생성일: 2026-05-28
- 참조문서: 없음
- 관계: -

## 목적

Naver Cloud Platform의 CLOVA OCR General API를 호출하여 이미지에서 텍스트를 추출.

## 사전 준비

1. NCP 계정 생성 + 카드 등록 (유료 서비스)
2. CLOVA OCR 도메인 생성 → Invoke URL + Secret Key 발급
3. **General OCR** 사용 (Template OCR은 고정 폼만 가능, 계좌 위치 다양해서 부적합)

## API 스펙 요약

- Endpoint: `POST {invokeUrl}/{version}/recognize`
- Headers: `X-OCR-SECRET: <secret>`, `Content-Type: multipart/form-data`
- Body: `message` (JSON), `file` (이미지 바이너리)
- Response: `images[].fields[]` (각 텍스트 박스의 `inferText`, `boundingPoly`, `inferConfidence`)

## 클라이언트 구조 (RN)

```
src/services/ocr/
  ├─ clovaClient.ts     // API 호출, FormData 구성, 에러 매핑
  ├─ types.ts           // 응답 타입 정의
  └─ index.ts
```

`recognize(imageUri: string): Promise<OcrResult>` 단일 진입점.

## 키 관리 전략

**MVP**: `react-native-config` + `.env`에 보관, 앱에 직접 내장.
- 리스크: 디컴파일 시 키 노출 가능. 사이드 프로젝트 초기엔 감수.

**추후**: 서버 프록시 (Cloudflare Workers 등)로 키 은닉.

## 에러 처리

- 네트워크 실패 → 1회 재시도 후 사용자에게 "다시 시도" UI
- API 에러 (4xx/5xx) → 에러 코드 그대로 노출 + 로그
- 이미지 크기 초과 (CLOVA 제한: 20MB) → 업로드 전 리사이즈 ([[APP-003]]에서 처리)

## 비용 예상

CLOVA General OCR: 약 2원~3원/호출 (2025년 기준 변동 가능). 사이드 프로젝트 초기 트래픽이면 월 수천 원 수준.

## 검증 항목

- [ ] 정상 이미지 1장 → 텍스트 추출 성공
- [ ] 잘못된 키 → 401 에러 명확하게 노출
- [ ] 네트워크 끊긴 상태 → 재시도 후 친절한 에러
