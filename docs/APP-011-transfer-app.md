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
- 결과 화면 버튼: `src/components/SendButton.tsx` — 아래 "송금 버튼"

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

### 송금 버튼 (1.2.1)

결과 화면 송금 버튼에 주거래 앱 아이콘을 넣고, 버튼 배경을 아이콘 배경색에 맞춘다
(디자인 캔버스 "A안 · 아이콘 배경색").

- 크기: 높이 60(최소), 안쪽 여백 12, 모서리 12. 아이콘 36×36(모서리 9) — 선택 화면 아이콘과 같은 크기
- 문구: 아이콘 오른쪽에 두 줄 — "○○(으)로 송금하기" 15px, 설명 11px
  - 자동입력 앱(토스·카카오페이): "은행·계좌번호가 채워진 송금 화면이 열려요"
  - 은행 앱: "계좌번호를 복사하고 앱을 열어요"
- 색(`TransferApp.button`): App Store 아이콘(240px)에서 잰 배경색
  - 그라데이션 아이콘(신한 슈퍼SOL, NH스마트뱅킹, 카카오뱅크)은 왼쪽 위 모서리 색. 앱마다 그라데이션을
    따라 그리면 버튼마다 모양이 달라져 통일감이 없어서 단색으로 통일했다
  - 흰색·노란색 배경 → 검은 글씨(#191919), 진한 배경 → 흰 글씨
  - 흰 배경(토스, 우리, IBK, 우체국, 신협, iM, 부산)은 흰색을 뺀 대표색으로 옅은 그림자
    `0 2px 8px (18%) + 0 0 0 1px (10%)`. `boxShadow`는 Android 9 미만에서 안 그려져서 같은 색 25% 테두리로 대신한다
- 계좌번호만 복사(아이콘 없음)는 기존 파란 버튼

| 앱 | 배경 | 글씨 | 그림자 |
|---|---|---|---|
| 토스 | #FFFFFF | 검정 | #005CFC |
| 카카오페이 | #FFEB00 | 검정 | |
| KB스타뱅킹 | #FFCC00 | 검정 | |
| 신한 슈퍼SOL | #2A96FF | 흰색 | |
| 우리WON뱅킹 | #FFFFFF | 검정 | #0028A0 |
| 하나원큐 | #009178 | 흰색 | |
| NH올원뱅크 | #19973C | 흰색 | |
| NH스마트뱅킹 | #007DDD | 흰색 | |
| IBK i-ONE Bank | #FFFFFF | 검정 | #104C9B |
| 카카오뱅크 | #FEE102 | 검정 | |
| 케이뱅크 | #0114A7 | 흰색 | |
| 우체국뱅킹 | #FFFFFF | 검정 | #CE20DA |
| MG더뱅킹 | #0F5EFF | 흰색 | |
| 신협ON뱅크 | #FFFFFF | 검정 | #1E45EC |
| iM뱅크 | #FFFFFF | 검정 | #05C7A7 |
| BNK부산은행 | #FFFFFF | 검정 | #D61C24 |
| BNK경남은행 | #D71820 | 흰색 | |

흰 글씨 대비가 낮은 배경이 있다(신한 #2A96FF 3.0, 하나 3.95, NH올원 3.8). 버튼 제목은 15px
굵은 글씨라 읽는 데 문제는 없지만, 아이콘이 바뀌어 색을 다시 잴 때 함께 확인할 것.

## 함께 고친 것

- 결과 화면에서 은행명을 직접 고치면 은행 코드가 옛 값으로 남아, 송금 링크가 엉뚱한 은행으로
  열릴 수 있었다 → 은행명 수정 시 코드도 다시 찾는다.

## 검증

- [x] 단위 테스트: `__tests__/transfer.test.ts` (18), `__tests__/TransferAppScreen.test.tsx` (렌더·선택 저장)
- [x] 단위 테스트: `__tests__/sendButton.test.tsx` (버튼 색 규칙·렌더)
- [ ] 실기기: 송금 버튼 그림자(iOS, Android 9+), Android 7–8 테두리 대체
- [x] codegen: `NativeAppLauncherSpec.launch(String, Promise)` 생성 확인
- [x] 실기기: 카카오페이 계좌 자동 입력 (2026-11-18)
- [ ] 실기기: iOS 각 은행 스킴 실행, Android 패키지 실행
