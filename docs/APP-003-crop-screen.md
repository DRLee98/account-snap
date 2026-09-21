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


## 수정 이력

### 2026-09-21 — 안드로이드에서 붓질이 전혀 되지 않던 문제

안드로이드에서만 계좌번호 영역 칠하기가 동작하지 않아 「계좌 읽기」가 계속 비활성
상태였다. 앱의 핵심 플로우가 안드로이드에서 완전히 막혀 있던 셈이다. iOS는 정상.

**원인** — 붓질을 `PanResponder`로 구현했는데, 앱 전체를 감싼
`GestureHandlerRootView`(RNGH 3.0)가 드래그 도중 RN responder를 **강제 취소**한다.
실기기(Galaxy S20+, Android 13) 계측 결과:

```
[BR] grant
[BR] move n=1
[BR] TERMINATE n=2      ← terminationRequest는 호출조차 되지 않음
```

`onPanResponderGrant`가 매번 `pointsRef`를 점 1개로 초기화하므로, 취소 → 재획득이
반복되며 점이 2개 이상 쌓이지 못했다. `points.length < 2`면 「계좌 읽기」가 비활성이라
버튼이 눌리지 않았다.

`onPanResponderTerminationRequest: () => false`는 **해결책이 아니다**. 이 콜백은 RN 내부
responder 협상에만 쓰이고, 네이티브가 강제 취소할 때는 호출되지 않는다.

**수정** — RNGH가 이미 루트에 있으므로 `PanResponder`를 RNGH의
`GestureDetector` + `Gesture.Pan()`으로 교체했다. 같은 제스처에서:

```
[BR] begin / update x48 / finalize n=49
```

- `.runOnJS(true)` — Reanimated 미설치 환경이라 콜백을 JS 스레드에서 실행
- `.minDistance(0)` — 짧은 획도 즉시 활성화
- `.shouldCancelWhenOutside(false)` — 이미지 밖으로 나가도 획 유지
- 좌표는 `e.x`/`e.y`(디텍터 기준 상대좌표)로 기존 `locationX`/`locationY`와 동일

## 검증 항목

- [x] 안드로이드 실기기에서 붓질 → 획 렌더링 → 버튼 활성화 (Galaxy S20+, Android 13)
- [x] 크롭 → OCR 호출 → 결과 화면 이동 (국민은행 123-4567-8901234 정상 인식)
- [ ] **iOS 회귀 확인** — PanResponder에서 RNGH로 바꿨으므로 재검증 필요. 미확인
- [ ] OCR 실패 시 에러 처리 동작
- [ ] 큰 이미지 (5000px) 리사이즈 후 업로드 확인
