# Account Snap

장사하시는 분들이 손글씨/프린트로 붙여둔 계좌번호를 사진으로 찍으면 OCR로 계좌번호와 은행명을 추출해주는 모바일 앱.

## 기술 스택

- **앱**: React Native (iOS + Android)
- **위젯**: 네이티브 (iOS WidgetKit / Android Glance)
- **OCR**: Naver CLOVA OCR (General)
- **저장**: 로컬 우선, 클라우드 동기화 가능한 데이터 모델

## 도메인 인덱스

| 도메인 | 코드 | 현황 파일 | 총 항목 | 완료 | 미완료 |
|--------|------|-----------|---------|------|--------|
| OCR 처리 | OCR | [plans/ocr.md](plans/ocr.md) | 2 | 2 | 0 |
| 앱 화면 | APP | [plans/app.md](plans/app.md) | 9 | 9 | 0 |
| 위젯 | WGT | [plans/widget.md](plans/widget.md) | 5 | 5 | 0 |
| 데이터/저장 | DAT | [plans/data.md](plans/data.md) | 3 | 2 | 1 |
| 광고 | AD | [plans/ad.md](plans/ad.md) | 3 | 2 | 1 |
| **합계** | - | - | **22** | **20** | **2** |

## 세션 노트

- [2026-06: App Store 출시 사이클](docs/SESSION-NOTES-2026-06.md) — AdFit, 편집 분리, 스와이프 액션, ATT, 출시 준비
