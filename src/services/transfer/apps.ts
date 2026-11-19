import type { ImageSourcePropType } from 'react-native';

/**
 * 송금 버튼이 여는 앱 ("주거래 은행").
 *
 * - prefill: 은행·계좌번호가 채워진 송금 화면을 연다 (토스, 카카오페이 — 실기기 확인)
 * - copyLaunch: 계좌번호를 복사하고 앱을 실행만 한다 (은행 앱 — 이체 자동입력 딥링크 없음)
 * - copyOnly: 앱을 열지 않고 복사만
 *
 * iOS 스킴은 앱마다 근거 수준이 다르다. 실기기 확인(2026-08): supertoss, kakaobank,
 * supersol, newsmartpib. 나머지는 PG 문서·비공식 목록 기준이라 후보를 순서대로 시도하고,
 * 모두 실패하면 "열지 못했어요" 안내로 넘어간다 (docs/APP-011).
 * Android는 패키지명으로 실행하므로 스킴 근거와 무관하게 동작한다.
 */
export type TransferMode = 'prefill' | 'copyLaunch' | 'copyOnly';

export type TransferAppId =
  | 'toss'
  | 'kakaopay'
  | 'kb'
  | 'shinhan'
  | 'woori'
  | 'hana'
  | 'nhallone'
  | 'nhsmart'
  | 'ibk'
  | 'kakaobank'
  | 'kbank'
  | 'epost'
  | 'mg'
  | 'cu'
  | 'im'
  | 'busan'
  | 'kyongnam'
  | 'copy';

/**
 * 결과 화면 송금 버튼 색 — 버튼 배경을 아이콘 배경색에 맞춘다 (docs/APP-011 "송금 버튼").
 * 값은 App Store 아이콘(240px)에서 잰 색이다.
 */
export type TransferAppButton = {
  /** 아이콘 배경색. 그라데이션 아이콘은 왼쪽 위 모서리 색 */
  background: string;
  /** 배경 위 글씨 — 흰색·노란색 배경은 dark(검정), 진한 배경은 light(흰색) */
  text: 'dark' | 'light';
  /** 흰 배경 아이콘만: 흰색을 뺀 대표색으로 옅은 그림자를 둘러 배경과 구분한다 */
  shadow?: string;
};

export type TransferApp = {
  id: TransferAppId;
  name: string;
  /** 결과 화면 버튼 문구 — 조사(로/으로)를 이름마다 맞춰 둔다 */
  sendLabel: string;
  mode: TransferMode;
  /** 선택 화면 이름 아래 설명 */
  hint?: string;
  icon?: ImageSourcePropType;
  /** 없으면(계좌번호만 복사) 앱 기본 파란 버튼 */
  button?: TransferAppButton;
  ios?: { schemes: string[]; appStoreId: string };
  android?: { packages: string[] };
  /** 복사할 때 은행명을 붙일지 — KB스타뱅킹은 '은행명 계좌번호'를 이체 화면이 자동 인식 */
  copyWithBankName?: boolean;
};

export const DEFAULT_TRANSFER_APP_ID: TransferAppId = 'toss';

export const TRANSFER_APPS: TransferApp[] = [
  {
    id: 'toss',
    name: '토스',
    sendLabel: '토스로 송금하기',
    mode: 'prefill',
    icon: require('../../../assets/transfer-apps/toss.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#005CFC' },
    ios: { schemes: ['supertoss'], appStoreId: '839333328' },
    android: { packages: ['viva.republica.toss'] },
  },
  {
    id: 'kakaopay',
    name: '카카오페이',
    sendLabel: '카카오페이로 송금하기',
    mode: 'prefill',
    icon: require('../../../assets/transfer-apps/kakaopay.png'),
    button: { background: '#FFEB00', text: 'dark' },
    // 송금은 카카오톡 안의 카카오페이에서 열린다
    ios: { schemes: ['kakaotalk'], appStoreId: '362057947' },
    android: { packages: ['com.kakao.talk'] },
  },
  {
    id: 'kb',
    name: 'KB스타뱅킹',
    sendLabel: 'KB스타뱅킹으로 송금하기',
    mode: 'copyLaunch',
    hint: '복사한 계좌를 이체 화면이 알아봐요',
    icon: require('../../../assets/transfer-apps/kb.png'),
    button: { background: '#FFCC00', text: 'dark' },
    ios: { schemes: ['kbbank'], appStoreId: '373742138' },
    android: { packages: ['com.kbstar.kbbank'] },
    copyWithBankName: true,
  },
  {
    id: 'shinhan',
    name: '신한 슈퍼SOL',
    sendLabel: '신한 슈퍼SOL로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/shinhan.png'),
    button: { background: '#2A96FF', text: 'light' },
    ios: { schemes: ['supersol', 'shinhansol'], appStoreId: '357484932' },
    android: { packages: ['com.shinhan.sbanking'] },
  },
  {
    id: 'woori',
    name: '우리WON뱅킹',
    sendLabel: '우리WON뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/woori.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#0028A0' },
    ios: { schemes: ['newsmartpib'], appStoreId: '1470181651' },
    android: { packages: ['com.wooribank.smart.npib'] },
  },
  {
    id: 'hana',
    name: '하나원큐',
    sendLabel: '하나원큐로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/hana.png'),
    button: { background: '#009178', text: 'light' },
    ios: { schemes: ['hanapush'], appStoreId: '6743190232' },
    android: { packages: ['com.hanabank.oqf', 'com.kebhana.hanapush'] },
  },
  {
    id: 'nhallone',
    name: 'NH올원뱅크',
    sendLabel: 'NH올원뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/nhallone.png'),
    button: { background: '#19973C', text: 'light' },
    ios: { schemes: ['nhallone', 'nhallonebank'], appStoreId: '1641628055' },
    android: { packages: ['com.nonghyup.nhallonebank', 'nh.smart.allonebank'] },
  },
  {
    id: 'nhsmart',
    name: 'NH스마트뱅킹',
    sendLabel: 'NH스마트뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/nhsmart.png'),
    button: { background: '#007DDD', text: 'light' },
    ios: { schemes: ['newnhsmartbanking'], appStoreId: '1444712671' },
    android: { packages: ['nh.smart.banking'] },
  },
  {
    id: 'ibk',
    name: 'IBK i-ONE Bank',
    sendLabel: 'IBK i-ONE Bank로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/ibk.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#104C9B' },
    ios: { schemes: ['ionebank', 'ibkone'], appStoreId: '1460543865' },
    android: { packages: ['com.ibk.android.ionebank'] },
  },
  {
    id: 'kakaobank',
    name: '카카오뱅크',
    sendLabel: '카카오뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/kakaobank.png'),
    button: { background: '#FEE102', text: 'dark' },
    ios: { schemes: ['kakaobank'], appStoreId: '1258016944' },
    android: { packages: ['com.kakaobank.channel'] },
  },
  {
    id: 'kbank',
    name: '케이뱅크',
    sendLabel: '케이뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/kbank.png'),
    button: { background: '#0114A7', text: 'light' },
    ios: { schemes: ['ukbanksmartbanknonloginpay'], appStoreId: '1178872627' },
    android: { packages: ['com.kbankwith.smartbank'] },
  },
  {
    id: 'epost',
    name: '우체국뱅킹',
    sendLabel: '우체국뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/epost.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#CE20DA' },
    ios: { schemes: ['com.epost.psf.sd'], appStoreId: '554920991' },
    android: { packages: ['com.epost.psf.sdsi'] },
  },
  {
    id: 'mg',
    name: 'MG더뱅킹',
    sendLabel: 'MG더뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/mg.png'),
    button: { background: '#0F5EFF', text: 'light' },
    ios: { schemes: ['kfccsb'], appStoreId: '425089902' },
    android: { packages: ['com.smg.spbs'] },
  },
  {
    id: 'cu',
    name: '신협ON뱅크',
    sendLabel: '신협ON뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/cu.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#1E45EC' },
    ios: { schemes: ['cuonbank'], appStoreId: '1484456647' },
    android: { packages: ['kr.co.cu.onbank'] },
  },
  {
    id: 'im',
    name: 'iM뱅크',
    sendLabel: 'iM뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/im.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#05C7A7' },
    ios: { schemes: ['mbanking'], appStoreId: '1067748687' },
    android: { packages: ['kr.co.dgb.dgbm'] },
  },
  {
    id: 'busan',
    name: 'BNK부산은행',
    sendLabel: 'BNK부산은행으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/busan.png'),
    button: { background: '#FFFFFF', text: 'dark', shadow: '#D61C24' },
    ios: { schemes: ['bslink'], appStoreId: '1445137607' },
    android: { packages: ['kr.co.busanbank.mbp'] },
  },
  {
    // iOS는 결제(뱅크페이)용 스킴만 알려져 있어 Android에서만 제공
    id: 'kyongnam',
    name: 'BNK경남은행',
    sendLabel: 'BNK경남은행으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/kyongnam.png'),
    button: { background: '#D71820', text: 'light' },
    android: { packages: ['com.knb.psb'] },
  },
  {
    id: 'copy',
    name: '계좌번호만 복사',
    sendLabel: '계좌번호 복사하기',
    mode: 'copyOnly',
    hint: '목록에 내 은행 앱이 없을 때',
  },
];

export function findTransferApp(
  id: string | undefined,
): TransferApp | undefined {
  return TRANSFER_APPS.find(app => app.id === id);
}

/** 이 플랫폼에서 열 수 있는 앱만 (copyOnly는 항상 포함) */
export function transferAppsFor(platform: 'ios' | 'android'): TransferApp[] {
  return TRANSFER_APPS.filter(
    app =>
      app.mode === 'copyOnly' ||
      (platform === 'ios' ? !!app.ios : !!app.android),
  );
}
