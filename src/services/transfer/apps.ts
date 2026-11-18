import type { ImageSourcePropType } from 'react-native';

/**
 * 송금 버튼이 여는 앱 ("주거래 은행").
 *
 * - prefill: 받는 사람 은행·계좌가 채워진 송금 화면을 연다 (토스만 확인됨)
 * - experimental: 채워질 수도 있는 비공식 딥링크 + 계좌번호 복사 (카카오페이)
 * - copyLaunch: 계좌번호를 복사하고 앱을 실행만 한다 (은행 앱 — 이체 자동입력 딥링크 없음)
 * - copyOnly: 앱을 열지 않고 복사만
 *
 * iOS 스킴은 앱마다 근거 수준이 다르다. 실기기 확인(2026-08): supertoss, kakaobank,
 * supersol, newsmartpib. 나머지는 PG 문서·비공식 목록 기준이라 후보를 순서대로 시도하고,
 * 모두 실패하면 "열지 못했어요" 안내로 넘어간다 (docs/APP-011).
 * Android는 패키지명으로 실행하므로 스킴 근거와 무관하게 동작한다.
 */
export type TransferMode =
  | 'prefill'
  | 'experimental'
  | 'copyLaunch'
  | 'copyOnly';

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

export type TransferApp = {
  id: TransferAppId;
  name: string;
  /** 결과 화면 버튼 문구 — 조사(로/으로)를 이름마다 맞춰 둔다 */
  sendLabel: string;
  mode: TransferMode;
  /** 선택 화면 이름 아래 설명 */
  hint?: string;
  icon?: ImageSourcePropType;
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
    hint: '받는 사람 은행·계좌번호가 채워진 송금 화면이 열려요',
    icon: require('../../../assets/transfer-apps/toss.png'),
    ios: { schemes: ['supertoss'], appStoreId: '839333328' },
    android: { packages: ['viva.republica.toss'] },
  },
  {
    id: 'kakaopay',
    name: '카카오페이',
    sendLabel: '카카오페이로 송금하기',
    mode: 'experimental',
    hint: '계좌가 채워지지 않으면 복사해 둔 계좌번호를 붙여넣기 해 주세요',
    icon: require('../../../assets/transfer-apps/kakaopay.png'),
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
    ios: { schemes: ['supersol', 'shinhansol'], appStoreId: '357484932' },
    android: { packages: ['com.shinhan.sbanking'] },
  },
  {
    id: 'woori',
    name: '우리WON뱅킹',
    sendLabel: '우리WON뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/woori.png'),
    ios: { schemes: ['newsmartpib'], appStoreId: '1470181651' },
    android: { packages: ['com.wooribank.smart.npib'] },
  },
  {
    id: 'hana',
    name: '하나원큐',
    sendLabel: '하나원큐로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/hana.png'),
    ios: { schemes: ['hanapush'], appStoreId: '6743190232' },
    android: { packages: ['com.hanabank.oqf', 'com.kebhana.hanapush'] },
  },
  {
    id: 'nhallone',
    name: 'NH올원뱅크',
    sendLabel: 'NH올원뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/nhallone.png'),
    ios: { schemes: ['nhallone', 'nhallonebank'], appStoreId: '1641628055' },
    android: { packages: ['com.nonghyup.nhallonebank', 'nh.smart.allonebank'] },
  },
  {
    id: 'nhsmart',
    name: 'NH스마트뱅킹',
    sendLabel: 'NH스마트뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/nhsmart.png'),
    ios: { schemes: ['newnhsmartbanking'], appStoreId: '1444712671' },
    android: { packages: ['nh.smart.banking'] },
  },
  {
    id: 'ibk',
    name: 'IBK i-ONE Bank',
    sendLabel: 'IBK i-ONE Bank로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/ibk.png'),
    ios: { schemes: ['ionebank', 'ibkone'], appStoreId: '1460543865' },
    android: { packages: ['com.ibk.android.ionebank'] },
  },
  {
    id: 'kakaobank',
    name: '카카오뱅크',
    sendLabel: '카카오뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/kakaobank.png'),
    ios: { schemes: ['kakaobank'], appStoreId: '1258016944' },
    android: { packages: ['com.kakaobank.channel'] },
  },
  {
    id: 'kbank',
    name: '케이뱅크',
    sendLabel: '케이뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/kbank.png'),
    ios: { schemes: ['ukbanksmartbanknonloginpay'], appStoreId: '1178872627' },
    android: { packages: ['com.kbankwith.smartbank'] },
  },
  {
    id: 'epost',
    name: '우체국뱅킹',
    sendLabel: '우체국뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/epost.png'),
    ios: { schemes: ['com.epost.psf.sd'], appStoreId: '554920991' },
    android: { packages: ['com.epost.psf.sdsi'] },
  },
  {
    id: 'mg',
    name: 'MG더뱅킹',
    sendLabel: 'MG더뱅킹으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/mg.png'),
    ios: { schemes: ['kfccsb'], appStoreId: '425089902' },
    android: { packages: ['com.smg.spbs'] },
  },
  {
    id: 'cu',
    name: '신협ON뱅크',
    sendLabel: '신협ON뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/cu.png'),
    ios: { schemes: ['cuonbank'], appStoreId: '1484456647' },
    android: { packages: ['kr.co.cu.onbank'] },
  },
  {
    id: 'im',
    name: 'iM뱅크',
    sendLabel: 'iM뱅크로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/im.png'),
    ios: { schemes: ['mbanking'], appStoreId: '1067748687' },
    android: { packages: ['kr.co.dgb.dgbm'] },
  },
  {
    id: 'busan',
    name: 'BNK부산은행',
    sendLabel: 'BNK부산은행으로 송금하기',
    mode: 'copyLaunch',
    icon: require('../../../assets/transfer-apps/busan.png'),
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
