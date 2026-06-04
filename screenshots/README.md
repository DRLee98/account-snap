# App Store 스크린샷

## 디렉토리
- `raw/` — iPhone에서 캡쳐한 원본 스크린샷 6장 (`01.png` ~ `06.png`)
- `output/` — 합성된 1320×2868 App Store 업로드용 이미지

## 사용법

### 1. 원본 스크린샷 캡쳐
연결된 iPhone에서 각 화면 캡쳐:

```sh
# 카메라 화면 (예시)
xcrun devicectl device process screenshot \
  --device 00008110-0016046E2E20201E \
  --output screenshots/raw/01.png
```

또는 iPhone에서 직접 캡쳐(전원+볼륨업) → AirDrop으로 Mac에 보내고 `raw/01.png` ~ `06.png` 로 저장.

권장 화면 순서:
1. `01.png` — 카메라 화면 (광고 배너 + 셔터 보이는 메인 화면)
2. `02.png` — 크롭 화면 (브러시로 영역 칠한 상태)
3. `03.png` — 결과 화면 (은행 + 계좌번호 표시)
4. `04.png` — 결과 화면 — 토스 송금 버튼 강조
5. `05.png` — 홈 화면 위젯 (작은/중간/큰 위젯 보이게)
6. `06.png` — 계좌 목록 (즐겨찾기 + 송금 버튼)

### 2. 합성 실행

```sh
node scripts/build-screenshots.js
```

`output/01-01.png` ~ `output/06-06.png` 6장 생성됨.

### 3. App Store Connect 업로드

App Store Connect → 앱 → 미리보기 및 스크린샷 → iPhone 6.9" 디스플레이 → 6장 드래그 업로드.
