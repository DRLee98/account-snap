# APP-001 RN 프로젝트 초기 세팅

## 문서 정보
- ID: APP-001
- 생성일: 2026-05-28
- 참조문서: 없음
- 관계: -

## 목적

React Native 0.7x 기반으로 iOS/Android 앱 골격 구축. 카메라/이미지/위젯 통합이 매끄러운 라이브러리 조합 선정.

## 프로젝트 생성

- **CLI**: `@react-native-community/cli` (Expo는 위젯/네이티브 모듈 작업 비중이 커서 bare workflow 우위)
- **언어**: TypeScript 기본 템플릿

## 핵심 라이브러리

| 영역 | 선택 | 이유 |
|------|------|------|
| 네비게이션 | `@react-navigation/native` + native-stack | 사실상 표준 |
| 카메라 | `react-native-vision-camera` | 성능, 활발한 유지보수, frame processor 지원 |
| 이미지 크롭 | `react-native-image-crop-picker` | 네이티브 크롭 UI 제공 (자체 구현 부담 회피) |
| 스토리지 | `react-native-mmkv` | [[DAT-002]] 결정 |
| 환경변수 | `react-native-config` | [[OCR-001]] 키 관리 |
| 클립보드 | `@react-native-clipboard/clipboard` | 결과 화면 복사 |
| 아이콘 | `react-native-svg` + 자체 SVG | 가볍게 |
| 상태관리 | Zustand | 작은 사이즈, Redux 오버킬 |

## 폴더 구조

```
account-snap/
├── ios/
│   ├── AccountSnap/             // 메인 앱
│   └── AccountSnapWidget/       // 위젯 익스텐션 ([[WGT-002]])
├── android/
│   └── app/src/main/
│       ├── java/.../            // 메인 앱
│       └── res/xml/widget_*.xml // 위젯 ([[WGT-003]])
├── src/
│   ├── screens/
│   │   ├── CameraScreen.tsx     // [[APP-002]]
│   │   ├── CropScreen.tsx       // [[APP-003]]
│   │   ├── ResultScreen.tsx     // [[APP-004]]
│   │   └── AccountListScreen.tsx// [[APP-005]]
│   ├── services/
│   │   ├── ocr/                 // [[OCR-001]] [[OCR-002]]
│   │   └── storage/             // [[DAT-002]]
│   ├── models/
│   │   └── account.ts           // [[DAT-001]]
│   ├── store/                   // Zustand
│   ├── navigation/
│   └── App.tsx
├── .env
└── package.json
```

## 권한 설정

- **iOS** Info.plist: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
- **Android** AndroidManifest.xml: `CAMERA`, `READ_MEDIA_IMAGES`

## 네비게이션 플로우

```
HomeTab (AccountListScreen) ──┬─ FAB → CameraScreen
                              │
CameraScreen ─────────────────→ CropScreen ──→ ResultScreen ──→ (back to Home)
```

## 검증 항목

- [ ] `npx react-native run-ios` / `run-android` 둘 다 빈 화면 정상 부팅
- [ ] vision-camera 권한 요청 동작
- [ ] MMKV 읽기/쓰기 동작
- [ ] .env 값 앱에서 읽기 가능
