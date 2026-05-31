import {
  NavigationContainer,
  LinkingOptions,
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import AccountListScreen from '../screens/AccountListScreen';
import CameraScreen from '../screens/CameraScreen';
import CropScreen from '../screens/CropScreen';
import ResultScreen from '../screens/ResultScreen';
import { RootStackParamList } from './types';
import { markUsed, getAccount } from '../services/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['accountsnap://'],
  config: {
    screens: {
      AccountList: '',
      Result: 'result/:accountId',
    },
  },
  // accountsnap://camera, accountsnap://copy/:id 는 App.tsx Linking listener에서 처리
  async getInitialURL() {
    return null;
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator initialRouteName="Camera">
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AccountList"
          component={AccountListScreen}
          options={{
            presentation: 'modal',
            title: '계좌 목록',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Crop"
          component={CropScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: '결과',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// 위젯 copy deep link 처리 (accountsnap://copy/<id>): App.tsx에서 Linking listener로 처리
export const handleCopyDeepLink = (url: string): boolean => {
  const m = url.match(/^accountsnap:\/\/copy\/([^/?]+)$/);
  if (!m) return false;
  const id = m[1];
  const acc = getAccount(id);
  if (!acc) return false;
  Clipboard.setString(acc.accountNumber);
  markUsed(id);
  return true;
};

// 위젯 카메라 deep link: 스택을 Camera 한 장으로 리셋해서 다른 화면이 가려지지 않게
export const handleCameraDeepLink = (url: string): boolean => {
  if (url !== 'accountsnap://camera') return false;
  if (!navigationRef.isReady()) return false;
  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Camera' }] }),
  );
  return true;
};
