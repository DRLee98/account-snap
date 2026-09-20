# AD-003 AdFit 안드로이드 네이티브 배너

## 문서 정보
- ID: AD-003
- 생성일: 2026-08-04
- 참조문서: [SESSION-NOTES-2026-06](SESSION-NOTES-2026-06.md) (AD-001 iOS 배너)
- 관계: iOS 구현과 동일한 JS 인터페이스를 안드로이드에 맞춰 구현

## 목적

iOS에만 있던 AdFit 배너를 안드로이드에도 붙인다. JS 쪽 `AdFitBanner` 컴포넌트는
그대로 두고, 안드로이드 네이티브 뷰(`AdFitBannerView`)를 새로 만들어 prop 규약을 맞춘다.

## 구성

| 레이어 | iOS | Android |
|--------|-----|---------|
| SDK | `pod 'AdFitSDK'` | `com.kakao.adfit:ads-base:3.22.2` |
| 네이티브 뷰 | `AdFitBannerWrapper.swift` | `AdFitBannerContainer` |
| 등록 | `AdFitBannerViewManager.mm` (RCTViewManager) | `AdFitBannerViewManager` (SimpleViewManager) + `AppPackage.createViewManagers` |

공통 prop: `clientId` / `adWidth` / `adHeight` / `cornerRadius`

## SDK 의존성

`ads-base`는 mavenCentral에 없어서 카카오 저장소를 따로 추가한다
(`android/build.gradle`의 `allprojects.repositories`).

```
https://devrepo.kakao.com/nexus/content/groups/public/
```

`includeGroup "com.kakao.adfit"`로 이 저장소가 다른 의존성 해석에 끼어들지 않게 제한한다.

## 구현 노트

- **`setAdUnitId` 사용** — 3.22 기준 `setClientId`는 deprecated, `setAdUnitSize`는
  deprecated + "Not working". 배너 크기는 **뷰의 실제 레이아웃 크기**로 결정되므로
  컨테이너를 JS에서 지정한 `width`/`height`로 잡고 배너를 `MATCH_PARENT`로 채운다.
- **Activity context 필수** — `BannerAdView(themedReactContext)`로 만들면 런타임에
  `IllegalArgumentException: Context must be Activity context!`로 죽는다.
  `reactContext.currentActivity`를 넘겨야 한다. Activity가 아직 없으면 `loadedKey`를
  남기지 않고 빠져나가서 `onAttachedToWindow` / `onHostResume` 때 다시 시도한다.
- **prop 반영 시점** — RN은 prop을 하나씩 전달하므로 `clientId`만 보고 배너를 만들면
  크기가 아직 기본값이다. 실제 생성은 `onAfterUpdateTransaction`에서 호출하는
  `commit()`에서만 하고, `clientId@가로x세로` 키가 바뀐 경우에만 재생성한다.
- **수동 레이아웃** — 광고 로드 후 배너가 크기를 다시 잡는데 RN이 관리하는 트리라
  `requestLayout()`이 전파되지 않는다. `onAdLoaded`에서 `measure`/`layout`을 직접 호출.
- **생명주기** — `LifecycleEventListener`로 `resume`/`pause`/`destroy` 연결.
  뷰가 언마운트되면 `onDropViewInstance` → `release()`에서 리스너 해제 + `destroy()`.
- **권한** — SDK 매니페스트가 `INTERNET`, `ACCESS_NETWORK_STATE`를 병합해 넣지만
  앱 매니페스트에도 명시했다. `AD_ID`는 이미 선언되어 있음.

## 광고 단위 코드

AdFit은 **플랫폼 × 사이즈**마다 코드를 따로 발급한다. 화면별·플랫폼별 선택은
`AdFitBanner.tsx`의 `AD_CLIENT_IDS`가 담당하며, 코드가 비어 있으면 배너를 렌더하지 않는다.

| 화면 | 사이즈 | iOS | Android |
|------|--------|-----|---------|
| 카메라 상단 | 320x50 | `ADFIT_IOS_CLIENT_ID` | `ADFIT_ANDROID_CLIENT_ID` |
| 결과 하단 | 320x100 | `ADFIT_IOS_RESULT_CLIENT_ID` | `ADFIT_ANDROID_RESULT_CLIENT_ID` |

> 안드로이드 코드 2개 발급 완료 (2026-08-04). `.env`는 gitignore 대상이므로
> 새 개발환경에서는 `.env.example`을 보고 직접 채워야 한다.

## 같이 고친 것

기존에 두 화면이 `Config.ADFIT_IOS_CLIENT_ID`를 직접 참조했다. `.env`는 두 플랫폼이
공유하므로 **안드로이드에서도 iOS 광고 단위 코드로 배너를 렌더**하려 했고, 당시엔
안드로이드에 `AdFitBannerView`가 없어 unimplemented component 상태였다.
`AD_CLIENT_IDS`로 플랫폼 분기하면서 해소.

## 검증 항목

- [x] `:app:assembleDebug` 빌드 성공 (SDK 해석 + 매니페스트 병합 확인)
- [x] 새 아키텍처 interop으로 legacy ViewManager 해석 — Pixel_9_Pro 에뮬레이터(API 36)에서
      `AdFitBannerView` 정상 생성, unimplemented component 없음
- [x] 카메라 화면 320x50 배너 실제 광고 노출 확인 (`Request Banner Ad` → 카카오비즈니스 소재)
- [ ] 결과 화면 320x100 배너 레이아웃 확인 — ResultScreen은 Camera→Crop→OCR을 거쳐야
      도달해서 CLOVA API 호출이 필요. 미확인
- [ ] 실기기(에뮬레이터 아님)에서 노출 확인
- [ ] 화면 회전 / 백그라운드 복귀 시 `resume`/`pause` 동작 확인

> `ViewManagerPropertyUpdater: Could not find generated setter` 경고가 뜨지만
> 리플렉션 폴백으로 prop이 정상 전달된다(광고가 실제로 로드됨). 동작 문제 아님.
