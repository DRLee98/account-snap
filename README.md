# 스냅넘버 (Account Snap)

계좌번호 사진을 찍으면 OCR로 추출해주는 모바일 앱.
손글씨/프린트로 적힌 계좌번호를 사진 한 장으로 인식하고 복사·송금까지 한 번에.

## 핵심 기능

- **사진 OCR** — Naver CLOVA OCR로 계좌번호/은행 자동 인식
- **브러시 영역 선택** — 칠한 영역만 정확히 추출 (배경 노이즈 차단)
- **은행 자동 추론** — prefix 패턴으로 14개 주요 은행 식별 + 은행별 표기 포맷
- **토스 송금 연동** — 인식 즉시 토스 송금 화면 호출 (deep link)
- **위젯** — iOS WidgetKit / Android Glance. 카메라 단축, 즐겨찾기 표시, 탭하면 클립보드 복사

## 기술 스택

- React Native 0.85 (New Arch / Bridgeless / TurboModule)
- iOS WidgetKit + App Group, Android Glance + Jetpack Compose
- MMKV 로컬 저장, react-native-config 환경변수
- react-native-vision-camera, react-native-svg, react-native-view-shot

## 개발 셋업

```bash
npm install
cp .env.example .env  # CLOVA 키 입력
cd ios && pod install && cd ..
```

```bash
npm start              # Metro (port 8082)
npm run ios            # iOS 빌드 + 실행
npm run android        # Android 빌드 + 실행
```

## 환경변수 (.env)

```env
CLOVA_INVOKE_URL=https://xxxxx.apigw.ntruss.com/custom/v1/.../general
CLOVA_SECRET_KEY=...

# 선택: proxy 사용 시 (출시 후 권장)
# OCR_PROXY_URL=https://your-worker.example.workers.dev/ocr
# OCR_PROXY_TOKEN=
```

## 링크

- [개인정보처리방침](https://drlee98.github.io/account-snap/privacy)
- [고객 지원](https://drlee98.github.io/account-snap/support)
