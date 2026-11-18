import { Alert, Linking, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  TRANSFER_APPS,
  findTransferApp,
  transferAppsFor,
} from '../src/services/transfer/apps';
import { resolveTransferApp } from '../src/services/transfer/preference';
import {
  clipboardTextFor,
  deepLinkFor,
  kakaoPayUrl,
  sendWithApp,
  storeUrlsFor,
} from '../src/services/transfer/send';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../src/services/storage/mmkv', () => ({
  storage: { getString: jest.fn(), set: jest.fn() },
}));
jest.mock('../src/specs/NativeAppLauncher', () => ({
  __esModule: true,
  default: { launch: jest.fn() },
}));

const nh = {
  bankName: '농협은행',
  bankCode: '011',
  accountNumber: '3521805984303',
};
const kb = {
  bankName: '국민은행',
  bankCode: '004',
  accountNumber: '11012345678901',
};
const app = (id: string) => findTransferApp(id)!;

describe('송금 앱 목록', () => {
  it('id가 겹치지 않고, 복사만 하기를 뺀 모든 앱에 아이콘이 있다', () => {
    const ids = TRANSFER_APPS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      TRANSFER_APPS.filter(a => a.mode !== 'copyOnly' && !a.icon).map(
        a => a.id,
      ),
    ).toEqual([]);
  });

  it('Android 패키지는 모두 AndroidManifest <queries>에 등록돼 있다', () => {
    // jest는 프로젝트 루트에서 실행된다
    const manifest: string = jest
      .requireActual('fs')
      .readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
    const missing = TRANSFER_APPS.flatMap(a => a.android?.packages ?? [])
      .filter(p => p !== 'viva.republica.toss')
      .filter(p => !manifest.includes(`<package android:name="${p}" />`));
    expect(missing).toEqual([]);
  });

  it('iOS 스킴이 없는 경남은행은 iOS 목록에서 빠지고, 복사만 하기는 항상 있다', () => {
    const ios = transferAppsFor('ios').map(a => a.id);
    const android = transferAppsFor('android').map(a => a.id);
    expect(ios).not.toContain('kyongnam');
    expect(android).toContain('kyongnam');
    expect(ios).toContain('copy');
    expect(android).toContain('copy');
  });
});

describe('resolveTransferApp — 주거래 앱 설정', () => {
  it('저장된 값이 없거나 모르는 값이면 토스', () => {
    expect(resolveTransferApp(undefined, 'ios').id).toBe('toss');
    expect(resolveTransferApp('nope', 'android').id).toBe('toss');
  });

  it('이 플랫폼에서 못 여는 앱이면 토스로 되돌린다', () => {
    expect(resolveTransferApp('kyongnam', 'ios').id).toBe('toss');
    expect(resolveTransferApp('kyongnam', 'android').id).toBe('kyongnam');
  });
});

describe('링크와 복사 문구', () => {
  it('KB스타뱅킹은 이체 화면 자동 인식을 위해 은행명과 함께 복사한다', () => {
    expect(clipboardTextFor(app('kb'), kb)).toBe('국민은행 110123-45-678901');
  });

  it('다른 은행 앱은 숫자만 복사한다', () => {
    expect(clipboardTextFor(app('shinhan'), nh)).toBe('3521805984303');
    expect(
      clipboardTextFor(app('kb'), {
        bankName: '(은행 미확인)',
        accountNumber: '999912345678',
      }),
    ).toBe('999912345678');
  });

  it('카카오페이 링크는 3자리 코드와 숫자만 넣고, 코드를 모르면 파라미터를 뺀다', () => {
    expect(kakaoPayUrl({ ...nh, accountNumber: '352-1805-9843-03' })).toBe(
      'kakaotalk://kakaopay/money/to/bank?bank_code=011&bank_account_number=3521805984303',
    );
    expect(
      kakaoPayUrl({ bankName: '농협', accountNumber: '3521805984303' }),
    ).toBe(
      'kakaotalk://kakaopay/money/to/bank?bank_code=011&bank_account_number=3521805984303',
    );
    expect(
      kakaoPayUrl({ bankName: '(은행 미확인)', accountNumber: '1234567890' }),
    ).toBe('kakaotalk://kakaopay/money/to/bank');
  });

  it('토스는 토스 표기 은행명으로 링크를 만든다', () => {
    expect(deepLinkFor(app('toss'), nh)).toBe(
      `supertoss://send?bank=${encodeURIComponent(
        '농협',
      )}&accountNo=3521805984303&amount=`,
    );
    expect(deepLinkFor(app('kb'), nh)).toBeUndefined();
  });

  it('스토어 주소', () => {
    expect(storeUrlsFor(app('kb'), 'ios')).toEqual([
      'https://apps.apple.com/kr/app/id373742138',
    ]);
    expect(storeUrlsFor(app('kb'), 'android')[0]).toBe(
      'market://details?id=com.kbstar.kbbank',
    );
  });
});

describe('sendWithApp', () => {
  let openURL: jest.SpyInstance;
  let alert: jest.SpyInstance;
  const onChooseOtherApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    openURL = jest.spyOn(Linking, 'openURL');
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    openURL.mockRestore();
    alert.mockRestore();
  });

  const run = async (id: string, account = nh) => {
    const p = sendWithApp(app(id), account, { onChooseOtherApp });
    await jest.advanceTimersByTimeAsync(1000);
    return p;
  };

  it('토스: 링크를 열면 복사 없이 opened', async () => {
    openURL.mockResolvedValue(true);
    expect(await run('toss')).toBe('opened');
    expect(openURL).toHaveBeenCalledWith(deepLinkFor(app('toss'), nh));
    expect(Clipboard.setString).not.toHaveBeenCalled();
  });

  it('토스가 없으면 계좌번호를 복사하고 안내를 띄운다', async () => {
    openURL.mockRejectedValue(new Error('no app'));
    expect(await run('toss')).toBe('failed');
    expect(Clipboard.setString).toHaveBeenCalledWith('3521805984303');
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0][2];
    expect(buttons.map((b: { text: string }) => b.text)).toEqual([
      '앱 설치하기',
      '다른 앱 선택',
      '닫기',
    ]);
    buttons[1].onPress();
    expect(onChooseOtherApp).toHaveBeenCalled();
  });

  it('은행 앱(iOS): 복사 → 알림 → 스킴 실행', async () => {
    openURL.mockResolvedValue(true);
    expect(await run('kb', kb)).toBe('opened');
    expect(Clipboard.setString).toHaveBeenCalledWith(
      '국민은행 110123-45-678901',
    );
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: '계좌번호를 복사했어요' }),
    );
    expect(openURL).toHaveBeenCalledWith('kbbank://');
  });

  it('은행 앱(iOS): 첫 스킴이 실패하면 다음 후보를 시도한다', async () => {
    openURL.mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce(true);
    expect(await run('shinhan')).toBe('opened');
    expect(openURL.mock.calls.map(c => c[0])).toEqual([
      'supersol://',
      'shinhansol://',
    ]);
  });

  it('은행 앱(iOS): 후보가 모두 실패하면 안내를 띄운다', async () => {
    openURL.mockRejectedValue(new Error('no'));
    expect(await run('nhallone')).toBe('failed');
    expect(openURL.mock.calls.map(c => c[0])).toEqual([
      'nhallone://',
      'nhallonebank://',
    ]);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('카카오페이: 복사하고 카카오톡 송금 링크를 연다', async () => {
    openURL.mockResolvedValue(true);
    expect(await run('kakaopay')).toBe('opened');
    expect(Clipboard.setString).toHaveBeenCalledWith('3521805984303');
    expect(openURL).toHaveBeenCalledWith(kakaoPayUrl(nh));
  });

  it('복사만 하기: 앱을 열지 않는다', async () => {
    expect(await run('copy')).toBe('copied');
    expect(Clipboard.setString).toHaveBeenCalledWith('3521805984303');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('은행 앱(Android): 패키지 후보를 순서대로 실행한다', async () => {
    const launcher = require('../src/specs/NativeAppLauncher').default;
    launcher.launch.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
    try {
      expect(await run('hana')).toBe('opened');
      expect(launcher.launch.mock.calls.map((c: string[]) => c[0])).toEqual([
        'com.hanabank.oqf',
        'com.kebhana.hanapush',
      ]);
      expect(openURL).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { get: () => original });
    }
  });
});
