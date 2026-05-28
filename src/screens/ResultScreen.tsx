import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Account, formatAccountNumber } from '../models/account';
import {
  getAccount,
  markUsed,
  toggleFavorite,
} from '../services/storage';
import { RootStackParamList } from '../navigation/types';

export default function ResultScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [account, setAccount] = useState<Account | undefined>(() =>
    getAccount(route.params.accountId),
  );

  const refresh = () => {
    if (!account) return;
    setAccount(getAccount(account.id));
  };

  if (!account) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>계좌를 찾을 수 없어요</Text>
      </View>
    );
  }

  const handleCopy = () => {
    // TODO(APP-004 follow-up): @react-native-clipboard/clipboard 추가
    markUsed(account.id);
    refresh();
    if (ToastAndroid?.show) {
      ToastAndroid.show('복사됨 (예정)', ToastAndroid.SHORT);
    }
  };

  const handleToggleFav = () => {
    toggleFavorite(account.id);
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {account.sourceImageUri && (
        <Image
          source={{ uri: account.sourceImageUri }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <View style={styles.card}>
        <Text style={styles.bankLine}>🏦 {account.bankName}</Text>
        <Text style={styles.numberLine}>
          {formatAccountNumber(account.accountNumber)}
        </Text>
        {account.holderName ? (
          <Text style={styles.sub}>👤 {account.holderName}</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primary} onPress={handleCopy}>
        <Text style={styles.primaryText}>📋 계좌번호 복사</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={handleToggleFav}>
        <Text style={styles.secondaryText}>
          {account.isFavorite ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tertiary}
        onPress={() => navigation.navigate('AccountList')}
      >
        <Text style={styles.tertiaryText}>완료</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        ※ OCR 결과는 mock 데이터. 실제 OCR은 OCR-001/002에서 CLOVA 연동 시 적용.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#666' },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  card: {
    padding: 20,
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    gap: 8,
  },
  bankLine: { fontSize: 14, color: '#666' },
  numberLine: { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  sub: { fontSize: 13, color: '#555' },
  primary: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007aff',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007aff',
    alignItems: 'center',
  },
  secondaryText: { color: '#007aff', fontSize: 15, fontWeight: '500' },
  tertiary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryText: { color: '#666', fontSize: 14 },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
