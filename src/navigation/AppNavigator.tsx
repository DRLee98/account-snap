import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import AccountListScreen from '../screens/AccountListScreen';
import CameraScreen from '../screens/CameraScreen';
import CropScreen from '../screens/CropScreen';
import ResultScreen from '../screens/ResultScreen';
import { RootStackParamList } from './types';
import { markUsed, getAccount } from '../services/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['accountsnap://'],
  config: {
    screens: {
      AccountList: '',
      Camera: 'camera',
      Result: 'result/:accountId',
    },
  },
  // accountsnap://copy/:id 는 RootStackParamList에 없는 경로 — 별도 처리
  async getInitialURL() {
    return null; // RN이 native Linking으로 대신 처리
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
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
