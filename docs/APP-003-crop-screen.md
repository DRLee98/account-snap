# APP-003 크롭 화면

## 문서 정보
- ID: APP-003
- 생성일: 2026-05-28
- 참조문서: [APP-002 촬영 화면](APP-002-camera-screen.md), [OCR-001 CLOVA OCR API 연동](OCR-001-clova-integration.md)
- 관계: 의존

## 목적

촬영/선택한 이미지에서 계좌 정보가 있는 영역만 잘라 OCR API 호출량/오인식을 줄이고, 결과 화면([[APP-004]])으로 OCR 결과를 전달.

## 구현 방식

`react-native-image-crop-picker`의 `openCropper` 호출.
- 직사각형 크롭 (회전 가능)
- 결과 이미지: JPEG, 최대 2048px (CLOVA 20MB 제한 여유)
- 비율 자유 (계좌 영역이 가로/세로 다양)

## 플로우

```
CropScreen (mount)
  └→ openCropper(sourceUri)
       ├→ 성공 → 로딩 오버레이 → OCR API ([[OCR-001]]) → 파서 ([[OCR-002]])
       │                              ↓
       │                       성공 → ResultScreen
       │                       실패 → 에러 토스트 + 재시도 버튼
       └→ 취소 → CameraScreen으로 back
```

## UI

- 크롭 화면은 라이브러리 네이티브 UI 사용 (자체 UI 없음)
- 크롭 후 OCR 호출 중에는 로딩 스피너 + "계좌 정보를 읽고 있어요..." 메시지

## 이미지 리사이즈

- 크롭 결과가 2048px 초과 시 다운스케일 (CLOVA 부담 감소 + 업로드 속도)
- `react-native-image-resizer` 사용

## 검증 항목

- [ ] 크롭 UI 정상 표시
- [ ] 크롭 → OCR 호출 → 결과 화면 이동
- [ ] OCR 실패 시 에러 처리 동작
- [ ] 큰 이미지 (5000px) 리사이즈 후 업로드 확인
