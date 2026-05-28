import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountListScreen from '../screens/AccountListScreen';
import CameraScreen from '../screens/CameraScreen';
import ResultScreen from '../screens/ResultScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AccountList">
        <Stack.Screen
          name="AccountList"
          component={AccountListScreen}
          options={{ title: 'Account Snap' }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ title: '계좌 촬영' }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: '결과' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
