import { useEffect, useRef } from 'react';
import {
  Alert,
  AppState,
  Linking,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BootSplash from 'react-native-bootsplash';
import AppNavigator, {
  handleCopyDeepLink,
  handleCameraDeepLink,
  navigationRef,
} from './src/navigation/AppNavigator';
import {
  detectClipboardAccount,
  markClipboardAccountSeen,
} from './src/services/clipboardAccount';
import { createAccount } from './src/services/storage';
import { formatAccountByBank } from './src/services/ocr';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const clipboardPromptOpen = useRef(false);

  useEffect(() => {
    const onUrl = (url: string) => {
      if (handleCopyDeepLink(url)) {
        Toast.show({ type: 'success', text1: '계좌번호 복사됨' });
        return;
      }
      handleCameraDeepLink(url);
    };
    const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));
    Linking.getInitialURL().then(url => {
      if (url) onUrl(url);
    });
    BootSplash.hide({ fade: true });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const checkClipboard = async () => {
      if (clipboardPromptOpen.current) return;
      const found = await detectClipboardAccount();
      if (!found) return;

      const { parsed } = found;
      clipboardPromptOpen.current = true;
      const shown = [
        parsed.bankName || '(은행 미확인)',
        formatAccountByBank(parsed.accountNumber, parsed.bankCode),
        parsed.holderName,
      ]
        .filter(Boolean)
        .join(' ');
      Alert.alert('클립보드에 계좌번호가 있어요', `${shown}\n저장할까요?`, [
        {
          text: '무시',
          style: 'cancel',
          onPress: () => {
            markClipboardAccountSeen(parsed.accountNumber);
            clipboardPromptOpen.current = false;
          },
        },
        {
          text: '저장',
          onPress: () => {
            markClipboardAccountSeen(parsed.accountNumber);
            const account = createAccount({
              accountNumber: parsed.accountNumber,
              bankName: parsed.bankName || '(은행 미확인)',
              bankCode: parsed.bankCode,
              holderName: parsed.holderName,
              ocrRawText: found.rawText,
            });
            clipboardPromptOpen.current = false;
            if (navigationRef.isReady()) {
              navigationRef.navigate('Edit', { accountId: account.id });
            }
          },
        },
      ]);
    };

    checkClipboard();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkClipboard();
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppNavigator />
        <Toast swipeable />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
