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
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  Building2,
  Copy as CopyIcon,
  Star,
  User,
} from 'lucide-react-native';
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
    Clipboard.setString(account.accountNumber);
    markUsed(account.id);
    refresh();
    Toast.show({
      type: 'success',
      text1: '계좌번호 복사됨',
      text2: account.accountNumber,
    });
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
        <View style={styles.row}>
          <Building2 size={16} color="#666" strokeWidth={2} />
          <Text style={styles.bankLine}>{account.bankName}</Text>
        </View>
        <Text style={styles.numberLine}>
          {formatAccountNumber(account.accountNumber)}
        </Text>
        {account.holderName ? (
          <View style={styles.row}>
            <User size={14} color="#666" strokeWidth={2} />
            <Text style={styles.sub}>{account.holderName}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primary} onPress={handleCopy}>
        <CopyIcon size={18} color="#fff" strokeWidth={2.2} />
        <Text style={styles.primaryText}>계좌번호 복사</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={handleToggleFav}>
        <Star
          size={16}
          color="#007aff"
          strokeWidth={2}
          fill={account.isFavorite ? '#007aff' : 'transparent'}
        />
        <Text style={styles.secondaryText}>
          {account.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tertiary}
        onPress={() => navigation.popToTop()}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankLine: { fontSize: 14, color: '#666' },
  numberLine: { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  sub: { fontSize: 13, color: '#555' },
  primary: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
