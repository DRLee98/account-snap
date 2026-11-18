import { Alert, Linking, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import AppLauncher from '../../specs/NativeAppLauncher';
import { Account } from '../../models/account';
import { findBankByText, formatAccountByBank } from '../ocr/bankPatterns';
import { buildTossSendUrl } from '../toss';
import { TransferApp } from './apps';

type SendAccount = Pick<Account, 'accountNumber' | 'bankName' | 'bankCode'>;

export type SendResult = 'opened' | 'copied' | 'failed';

const digitsOf = (account: SendAccount) =>
  account.accountNumber.replace(/[^\d]/g, '');

const bankCodeOf = (account: SendAccount) =>
  account.bankCode ?? findBankByText(account.bankName)?.code;

export function clipboardTextFor(
  app: TransferApp,
  account: SendAccount,
): string {
  const digits = digitsOf(account);
  const code = bankCodeOf(account);
  if (app.copyWithBankName && code) {
    return `${account.bankName} ${formatAccountByBank(digits, code)}`;
  }
  return digits;
}

/**
 * 카카오페이 계좌송금 링크. 공식 가이드의 파라미터지만 알림톡 전용이라
 * 외부 앱에서는 비공식이다 — 계좌가 안 채워질 수 있어 항상 복사와 함께 쓴다.
 * 계좌번호에 하이픈이 있으면 열리지 않으므로 숫자만 넣는다.
 */
export function kakaoPayUrl(account: SendAccount): string {
  const code = bankCodeOf(account);
  if (!code) return 'kakaotalk://kakaopay/money/to/bank';
  return `kakaotalk://kakaopay/money/to/bank?bank_code=${code}&bank_account_number=${digitsOf(
    account,
  )}`;
}

export function deepLinkFor(
  app: TransferApp,
  account: SendAccount,
): string | undefined {
  if (app.id === 'toss') return buildTossSendUrl(account);
  if (app.id === 'kakaopay') return kakaoPayUrl(account);
  return undefined;
}

export function storeUrlsFor(
  app: TransferApp,
  platform: 'ios' | 'android',
): string[] {
  if (platform === 'ios') {
    return app.ios
      ? [`https://apps.apple.com/kr/app/id${app.ios.appStoreId}`]
      : [];
  }
  const pkg = app.android?.packages[0];
  return pkg
    ? [
        `market://details?id=${pkg}`,
        `https://play.google.com/store/apps/details?id=${pkg}`,
      ]
    : [];
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    // canOpenURL을 쓰지 않는다: iOS 27부터 사전 등록 스킴이 25개로 줄고 deprecated.
    // openURL은 앱이 없으면 reject한다.
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function launchApp(app: TransferApp): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (!AppLauncher || !app.android) return false;
    for (const pkg of app.android.packages) {
      try {
        if (await AppLauncher.launch(pkg)) return true;
      } catch {
        // 다음 후보 패키지
      }
    }
    return false;
  }
  for (const scheme of app.ios?.schemes ?? []) {
    if (await tryOpenUrl(`${scheme}://`)) return true;
  }
  return false;
}

async function openStore(app: TransferApp) {
  const platform = Platform.OS === 'android' ? 'android' : 'ios';
  for (const url of storeUrlsFor(app, platform)) {
    if (await tryOpenUrl(url)) return;
  }
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// 복사 알림을 잠깐 보여준 뒤 다른 앱으로 넘어가야 복사된 걸 알 수 있다
const TOAST_BEFORE_LAUNCH_MS = 600;

function showCopiedToast(app: TransferApp, account: SendAccount) {
  const text2 =
    app.mode === 'copyOnly'
      ? formatAccountByBank(digitsOf(account), bankCodeOf(account))
      : app.mode === 'experimental'
      ? '계좌가 채워지지 않으면 붙여넣기 하세요'
      : `${app.name} 이체 화면에서 붙여넣기 하세요`;
  Toast.show({ type: 'success', text1: '계좌번호를 복사했어요', text2 });
}

function showOpenFailed(
  app: TransferApp,
  account: SendAccount,
  onChooseOtherApp: () => void,
) {
  Clipboard.setString(clipboardTextFor(app, account));
  Alert.alert(
    `${app.name} 앱을 열지 못했어요`,
    '계좌번호는 복사해 두었어요. 앱이 설치되어 있는지 확인해 주세요.',
    [
      { text: '앱 설치하기', onPress: () => openStore(app) },
      { text: '다른 앱 선택', onPress: onChooseOtherApp },
      { text: '닫기', style: 'cancel' },
    ],
  );
}

/**
 * 주거래 앱으로 송금을 시작한다.
 * 'opened': 앱을 열었음, 'copied': 복사만 함, 'failed': 앱을 못 열어 안내를 띄움.
 */
export async function sendWithApp(
  app: TransferApp,
  account: SendAccount,
  { onChooseOtherApp }: { onChooseOtherApp: () => void },
): Promise<SendResult> {
  if (app.mode === 'copyOnly') {
    Clipboard.setString(clipboardTextFor(app, account));
    showCopiedToast(app, account);
    return 'copied';
  }

  if (app.mode === 'prefill') {
    const url = deepLinkFor(app, account);
    if (url && (await tryOpenUrl(url))) return 'opened';
    showOpenFailed(app, account, onChooseOtherApp);
    return 'failed';
  }

  Clipboard.setString(clipboardTextFor(app, account));
  showCopiedToast(app, account);
  await wait(TOAST_BEFORE_LAUNCH_MS);

  const url = deepLinkFor(app, account);
  const opened = url ? await tryOpenUrl(url) : await launchApp(app);
  if (opened) return 'opened';
  showOpenFailed(app, account, onChooseOtherApp);
  return 'failed';
}
