import { ReactNode, useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { Clock, Send, Star } from 'lucide-react-native';
import { openTossSend } from '../services/toss';
import { formatAccountByBank } from '../services/ocr';
import { Account } from '../models/account';
import {
  clearAll,
  createAccount,
  listFavorites,
  listHistory,
  markUsed,
  toggleFavorite,
} from '../services/storage';
import AppGroup from '../specs/NativeAppGroup';
import { RootStackParamList } from '../navigation/types';

type Tab = 'favorites' | 'history';

export default function AccountListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('favorites');
  const [data, setData] = useState<Account[]>([]);

  const reload = useCallback(() => {
    setData(tab === 'favorites' ? listFavorites() : listHistory());
  }, [tab]);

  useFocusEffect(reload);

  useLayoutEffect(() => {
    if (!__DEV__) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            clearAll();
            reload();
          }}
          hitSlop={8}
        >
          <Text style={styles.clearBtn}>비우기</Text>
        </Pressable>
      ),
    });
  }, [navigation, reload]);

  const handleSeed = () => {
    createAccount({
      accountNumber: '11012345678901',
      bankName: '국민은행',
      bankCode: '004',
      label: '본가 김치 계좌',
      isFavorite: true,
    });
    createAccount({
      accountNumber: '11098765432109',
      bankName: '신한은행',
      bankCode: '088',
      label: '우리 가게',
      isFavorite: true,
    });
    createAccount({
      accountNumber: '3333123412345',
      bankName: '카카오뱅크',
      bankCode: '090',
      holderName: '김장보',
    });
    reload();
  };

  const handleToggleFavorite = (account: Account) => {
    toggleFavorite(account.id);
    reload();
  };

  const handleCopy = (account: Account) => {
    Clipboard.setString(account.accountNumber);
    markUsed(account.id);
    Toast.show({
      type: 'success',
      text1: '계좌번호 복사됨',
      text2: account.accountNumber,
    });
    reload();
  };

  const handleSend = async (account: Account) => {
    const sent = await openTossSend(account);
    if (sent) {
      markUsed(account.id);
      reload();
    }
  };

  const renderItem = ({ item }: { item: Account }) => (
    <Pressable style={styles.card} onPress={() => handleCopy(item)}>
      <Pressable
        hitSlop={8}
        onPress={() => handleToggleFavorite(item)}
        style={styles.favBtn}
      >
        <Star
          size={22}
          color={item.isFavorite ? '#f5a623' : '#bbb'}
          strokeWidth={2}
          fill={item.isFavorite ? '#f5a623' : 'transparent'}
        />
      </Pressable>
      <View style={styles.cardLeft}>
        {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
        <Text style={styles.bank}>
          {item.bankName}
          {item.holderName ? `  •  ${item.holderName}` : ''}
        </Text>
        <Text style={styles.number}>
          {formatAccountByBank(item.accountNumber, item.bankCode)}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={() => handleSend(item)}
        style={styles.sendBtn}
      >
        <Send size={18} color="#007aff" strokeWidth={2.2} />
      </Pressable>
    </Pressable>
  );

  const empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {tab === 'favorites'
          ? '즐겨찾기한 계좌가 없어요'
          : '아직 추출한 계좌가 없어요'}
      </Text>
      {__DEV__ && (
        <View style={styles.devButton}>
          <Button title="더미 데이터 추가 (dev)" onPress={handleSeed} />
          <View style={{ height: 8 }} />
          <Button
            title="AppGroup TurboModule 테스트 (dev)"
            color="#888"
            onPress={async () => {
              try {
                AppGroup.setString('poc:tm', 'hello-from-rn');
                const got = await AppGroup.getString('poc:tm');
                Alert.alert(
                  'TurboModule OK',
                  `setString → getString: ${JSON.stringify(
                    got,
                  )}\n\ncontainerPath: ${
                    AppGroup.getConstants().containerPath
                  }`,
                );
              } catch (e: any) {
                Alert.alert('TurboModule 실패', e?.message ?? String(e));
              }
            }}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TabButton
          icon={
            <Star
              size={14}
              color={tab === 'favorites' ? '#007aff' : '#666'}
              strokeWidth={2}
              fill={tab === 'favorites' ? '#007aff' : 'transparent'}
            />
          }
          label="즐겨찾기"
          active={tab === 'favorites'}
          onPress={() => setTab('favorites')}
        />
        <TabButton
          icon={
            <Clock
              size={14}
              color={tab === 'history' ? '#007aff' : '#666'}
              strokeWidth={2}
            />
          }
          label="히스토리"
          active={tab === 'history'}
          onPress={() => setTab('history')}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        ListEmptyComponent={empty}
        contentContainerStyle={
          data.length === 0 ? styles.listEmptyContainer : styles.list
        }
      />

      <Toast position="top" topOffset={16} />
    </View>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <View style={styles.tabContent}>
        {icon}
        <Text style={[styles.tabText, active && styles.tabTextActive]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007aff',
  },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#007aff', fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  listEmptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardLeft: { flex: 1, marginLeft: 12 },
  favBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, color: '#666', marginBottom: 2 },
  bank: { fontSize: 13, color: '#444', marginBottom: 4 },
  number: { fontSize: 16, fontWeight: '600' },
  copyIcon: { fontSize: 22 },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  emptyHint: { fontSize: 13, color: '#999', textAlign: 'center' },
  devButton: { marginTop: 24 },
  clearBtn: { color: '#c33', fontSize: 12, width: 60, textAlign: 'center' },
});
