import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  formatAccountNumber,
  Account,
} from '../models/account';
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
        <Button
          title="clear"
          color="#c33"
          onPress={() => {
            clearAll();
            reload();
          }}
        />
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

  const renderItem = ({ item }: { item: Account }) => (
    <Pressable
      style={styles.card}
      onPress={() => handleCopy(item)}
      onLongPress={() => handleToggleFavorite(item)}
    >
      <View style={styles.cardLeft}>
        {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
        <Text style={styles.bank}>
          {item.bankName}
          {item.holderName ? `  •  ${item.holderName}` : ''}
        </Text>
        <Text style={styles.number}>
          {formatAccountNumber(item.accountNumber)}
        </Text>
      </View>
      <Text style={styles.copyIcon}>{item.isFavorite ? '⭐' : '☆'}</Text>
    </Pressable>
  );

  const empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {tab === 'favorites'
          ? '즐겨찾기한 계좌가 없어요'
          : '아직 추출한 계좌가 없어요'}
      </Text>
      <Text style={styles.emptyHint}>
        하단 카메라 버튼으로 첫 계좌를 찍어보세요
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
                  `setString → getString: ${JSON.stringify(got)}\n\ncontainerPath: ${AppGroup.getConstants().containerPath}`,
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
          label="⭐ 즐겨찾기"
          active={tab === 'favorites'}
          onPress={() => setTab('favorites')}
        />
        <TabButton
          label="🕒 히스토리"
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.fabIcon}>📷</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
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
  cardLeft: { flex: 1 },
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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabIcon: { fontSize: 26 },
});
