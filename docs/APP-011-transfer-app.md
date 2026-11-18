# APP-011 주거래 은행 (송금 앱 선택)

## 문서 정보
- ID: APP-011
- 생성일: 2026-11-18
- 참조문서: [APP-004 결과 화면](APP-004-result-screen.md), [APP-005 계좌 목록](APP-005-account-list.md)
- 관계: 확장 (기존 토스 송금 버튼을 일반화)

## 목적

송금 버튼이 토스만 열던 것을, 사용자가 고른 앱("주거래 은행")을 열도록 바꾼다. 기본값은 토스.

## 조사 결과 요약 (2026-11-18)

| 구분 | 앱 | 동작 |
|---|---|---|
| 계좌 자동 입력 | 토스 | `supertoss://send?bank=<토스 표기>&accountNo=<숫자>` — iOS·Android 실기기 확인 기록 있음, 비공식 |
| 계좌 자동 입력 | 카카오페이 | `kakaotalk://kakaopay/money/to/bank?bank_code=<3자리>&bank_account_number=<숫자>` — 공식 가이드 규격(알림톡용). 조사 당시엔 근거가 약해 "실험 기능"으로 시작했으나, 실기기에서 계좌 자동 입력을 확인해 토스와 같은 묶음으로 옮김. 비공식이라 예고 없이 바뀔 수 있음 |
| 복사 후 앱 실행 | 은행 앱 15개 | 이체 화면 자동입력 딥링크가 공개된 은행 앱은 없음. 계좌번호를 복사하고 앱을 연다 |
| 복사만 | — | 목록에 없는 은행용 |

- KB스타뱅킹은 '계좌번호 복사 이체' 기능이 있어 `은행명 계좌번호`를 복사하면 이체 화면이 자동 인식한다 → KB만 은행명을 붙여 복사, 나머지는 숫자만.
- 토스 `bank=`에 '농협은행'·'국민은행'을 넘기면 에러(실기기 34개 표기 시험) → 3자리 코드를 토스 짧은 표기로 매핑 (`src/services/toss.ts`).
- 근거는 공식 문서·PG 문서·GitHub 실사용 코드·개발 블로그·APK 매니페스트를 교차 확인했고,
  "송금 화면 자동입력" 주장은 반박 검증을 거쳤다(토스: 확인, 카카오페이: 불확실 → 이후 실기기로 확인).

## 구현

- `src/services/transfer/apps.ts` — 앱 목록(모드, 버튼 문구, 아이콘, iOS 스킴 후보, Android 패키지 후보, App Store ID)
- `src/services/transfer/preference.ts` — MMKV `settings:transferAppId`, 기본 토스. 이 플랫폼에서 못 여는 앱이면 토스로 되돌림
- `src/services/transfer/send.ts` — `sendWithApp()`
  - prefill: 딥링크 열기. 은행 코드를 몰라 계좌를 링크에 못 실은 경우(카카오페이)만 복사해 둔다
  - copyLaunch: 복사 → "계좌번호를 복사했어요" 알림 0.6초 → 앱 열기
  - copyOnly: 복사만
  - 실패: 계좌번호 복사 + "○○ 앱을 열지 못했어요" Alert [앱 설치하기 / 다른 앱 선택 / 닫기]
- `src/screens/TransferAppScreen.tsx` — 선택 화면 (라우트 `TransferApp`, 제목 "주거래 은행")
- 진입점: 계좌 목록 헤더 톱니바퀴, 결과 화면 "주거래 은행 · ○○ 변경"
- 결과 화면 버튼: "○○(으)로 송금하기", 복사형 앱은 "계좌번호를 복사하고 앱을 열어요" 부연

### 앱 열기

- **iOS**: `Linking.openURL('<scheme>://')`를 후보 순서대로 시도. `canOpenURL`은 쓰지 않는다 —
  iOS 27 SDK부터 `LSApplicationQueriesSchemes`가 25개로 줄고 deprecated. `openURL`은 등록 없이
  쓸 수 있고 앱이 없으면 reject된다.
- **Android**: TurboModule `AppLauncher.launch(packageName)` (`getLaunchIntentForPackage`).
  Android 11+ 패키지 가시성 때문에 대상 패키지를 `AndroidManifest.xml` `<queries>`에 등록했다.
  `__tests__/transfer.test.ts`가 목록과 매니페스트가 어긋나지 않는지 검사한다.

### iOS 스킴 근거 수준

| 근거 | 앱 |
|---|---|
| 실기기 확인(2026-08) | 토스 `supertoss`, 카카오뱅크 `kakaobank`, 신한 `supersol`, 우리 `newsmartpib` |
| PG 문서·공식 웹 | KB `kbbank`, NH올원 `nhallone`/`nhallonebank`, NH스마트 `newnhsmartbanking`, IBK `ionebank`/`ibkone`, 카카오톡 `kakaotalk` |
| 비공식 목록만 | 하나원큐 `hanapush`(구 앱 스킴), 케이뱅크 `ukbanksmartbanknonloginpay`, 우체국 `com.epost.psf.sd`, MG `kfccsb`, 신협 `cuonbank`, iM `mbanking`, 부산 `bslink` |
| 없음 | 경남은행 — 결제(뱅크페이) 스킴뿐이라 iOS 목록에서 제외, Android만 |

근거가 약한 스킴은 실패해도 계좌번호는 복사된 상태로 "열지 못했어요" 안내가 뜬다.
실기기에서 확인되면 이 표를 갱신할 것.

### 아이콘

`assets/transfer-apps/*.png` (120px). App Store 검색 API의 각 앱 공식 아이콘(artwork)을
2026-11-18에 받아 줄였다. 앱 아이콘이 바뀌면 같은 방식으로 다시 받는다. 각 아이콘의 권리는
해당 금융사에 있으며, 앱을 식별해 여는 용도로만 쓴다.

## 함께 고친 것

- 결과 화면에서 은행명을 직접 고치면 은행 코드가 옛 값으로 남아, 송금 링크가 엉뚱한 은행으로
  열릴 수 있었다 → 은행명 수정 시 코드도 다시 찾는다.

## 검증

- [x] 단위 테스트: `__tests__/transfer.test.ts` (18), `__tests__/TransferAppScreen.test.tsx` (렌더·선택 저장)
- [x] codegen: `NativeAppLauncherSpec.launch(String, Promise)` 생성 확인
- [x] 실기기: 카카오페이 계좌 자동 입력 (2026-11-18)
- [ ] 실기기: iOS 각 은행 스킴 실행, Android 패키지 실행
