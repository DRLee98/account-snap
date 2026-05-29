import { Alert, Linking, Platform } from 'react-native';
import { Account } from '../models/account';

const TOSS_STORE_IOS = 'https://apps.apple.com/kr/app/toss/id839333328';
const TOSS_STORE_ANDROID = 'market://details?id=viva.republica.toss';

/**
 * 토스 앱이 설치돼 있으면 송금 화면을 deep link로 열고,
 * 없으면 설치 안내 Alert을 띄운다. 반환값: 송금 시도가 시작됐는지.
 */
export async function openTossSend(account: Account): Promise<boolean> {
  const bank = encodeURIComponent(account.bankName);
  const acctNo = encodeURIComponent(account.accountNumber);
  const url = `supertoss://send?bank=${bank}&accountNo=${acctNo}&amount=`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // canOpenURL 또는 openURL 실패 시 fallback
  }

  Alert.alert(
    '토스 앱이 필요해요',
    '토스 앱이 설치되어 있어야 송금 화면으로 바로 이동할 수 있어요.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '설치하기',
        onPress: () => {
          const storeUrl =
            Platform.OS === 'ios' ? TOSS_STORE_IOS : TOSS_STORE_ANDROID;
          Linking.openURL(storeUrl);
        },
      },
    ],
  );
  return false;
}
