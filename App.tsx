import { useEffect } from 'react';
import { Linking, StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BootSplash from 'react-native-bootsplash';
import AppNavigator, {
  handleCopyDeepLink,
  handleCameraDeepLink,
} from './src/navigation/AppNavigator';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

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
