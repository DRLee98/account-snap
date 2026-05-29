import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Send,
  Star,
  Tag,
  User,
} from 'lucide-react-native';
import { Account, normalizeAccountNumber } from '../models/account';
import {
  getAccount,
  markUsed,
  toggleFavorite,
  updateAccount,
} from '../services/storage';
import { openTossSend } from '../services/toss';
import {
  formatAccountByBank,
  inferBankByAccountNumber,
  ParsedAccount,
} from '../services/ocr';
import { RootStackParamList } from '../navigation/types';

export default function ResultScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [account, setAccount] = useState<Account | undefined>(() =>
    getAccount(route.params.accountId),
  );
  const [candidates, setCandidates] = useState<ParsedAccount[]>(
    route.params.candidates ?? [],
  );

  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(
    account ? formatAccountByBank(account.accountNumber, account.bankCode) : '',
  );
  const [holderName, setHolderName] = useState(account?.holderName ?? '');
  const [label, setLabel] = useState(account?.label ?? '');

  if (!account) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>계좌를 찾을 수 없어요</Text>
      </View>
    );
  }

  const persist = (
    patch: Partial<
      Pick<
        Account,
        'bankName' | 'accountNumber' | 'bankCode' | 'holderName' | 'label'
      >
    >,
  ) => {
    const updated = updateAccount(account.id, patch);
    if (updated) setAccount(updated);
  };

  const handleBankBlur = () => {
    if (bankName.trim() === account.bankName) return;
    persist({ bankName: bankName.trim() || '(은행 미확인)' });
  };

  const handleAccountBlur = () => {
    const normalized = normalizeAccountNumber(accountNumber);
    if (normalized === account.accountNumber) return;
    if (normalized.length < 8) return;
    // 계좌번호 변경 시 prefix로 은행 재추론 (텍스트로 은행이 비어있을 때만)
    const inferred =
      !account.bankName.trim() || account.bankName === '(은행 미확인)'
        ? inferBankByAccountNumber(normalized)
        : undefined;
    const patch: Partial<Account> = { accountNumber: normalized };
    if (inferred) {
      patch.bankName = inferred.name;
      patch.bankCode = inferred.code;
    }
    persist(patch);
    setAccountNumber(
      formatAccountByBank(normalized, inferred?.code ?? account.bankCode),
    );
    if (inferred) setBankName(inferred.name);
  };

  const handleHolderBlur = () => {
    const trimmed = holderName.trim();
    if (trimmed === (account.holderName ?? '')) return;
    persist({ holderName: trimmed || undefined });
  };

  const handleLabelBlur = () => {
    const trimmed = label.trim();
    if (trimmed === (account.label ?? '')) return;
    persist({ label: trimmed || undefined });
  };

  const handleCopy = () => {
    Clipboard.setString(account.accountNumber);
    markUsed(account.id);
    setAccount(getAccount(account.id));
    Toast.show({
      type: 'success',
      text1: '계좌번호 복사됨',
      text2: formatAccountByBank(account.accountNumber, account.bankCode),
    });
  };

  const handleToggleFav = () => {
    toggleFavorite(account.id);
    setAccount(getAccount(account.id));
  };

  const handleTossSend = async () => {
    const sent = await openTossSend(account);
    if (sent) {
      markUsed(account.id);
      setAccount(getAccount(account.id));
    }
  };

  const handleSelectCandidate = (c: ParsedAccount, idx: number) => {
    // 현재 primary를 candidates 맨 위로 보내고 선택한 c를 primary로
    const prev: ParsedAccount = {
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      bankCode: account.bankCode,
      holderName: account.holderName,
      confidence: 0,
    };
    const next = [...candidates];
    next.splice(idx, 1);
    next.unshift(prev);
    setCandidates(next);
    persist({
      accountNumber: c.accountNumber,
      bankName: c.bankName || '(은행 미확인)',
      bankCode: c.bankCode,
    });
    setBankName(c.bankName || '');
    setAccountNumber(formatAccountByBank(c.accountNumber, c.bankCode));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {account.sourceImageUri && (
        <Image
          source={{ uri: account.sourceImageUri }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* <Text style={styles.disclaimer}>OCR 직후 자동 복사됨.</Text> */}
      <Text style={styles.disclaimer}>
        잘못 인식된 값이 있다면 아래 필드를 탭해서 수정해주세요.
      </Text>

      <View style={styles.card}>
        <Field
          icon={<Building2 size={16} color="#666" strokeWidth={2} />}
          label="은행"
          value={bankName}
          onChangeText={setBankName}
          onBlur={handleBankBlur}
          placeholder="은행명"
        />
        <Field
          label="계좌번호"
          value={accountNumber}
          onChangeText={setAccountNumber}
          onBlur={handleAccountBlur}
          placeholder="계좌번호"
          keyboardType="number-pad"
          big
        />
        <Field
          icon={<User size={14} color="#666" strokeWidth={2} />}
          label="예금주"
          value={holderName}
          onChangeText={setHolderName}
          onBlur={handleHolderBlur}
          placeholder="(선택) 홍길동"
        />
        <Field
          icon={<Tag size={14} color="#666" strokeWidth={2} />}
          label="별칭"
          value={label}
          onChangeText={setLabel}
          onBlur={handleLabelBlur}
          placeholder="(선택) 자주가는 분식집"
        />
      </View>

      {candidates.length > 0 && (
        <View style={styles.candidatesBox}>
          <Text style={styles.candidatesTitle}>다른 후보 (탭해서 변경)</Text>
          {candidates.map((c, i) => (
            <Pressable
              key={`${c.accountNumber}-${i}`}
              style={styles.candidateRow}
              onPress={() => handleSelectCandidate(c, i)}
            >
              <Text style={styles.candidateBank}>
                {c.bankName || '(은행 미상)'}
              </Text>
              <Text style={styles.candidateNum}>
                {formatAccountByBank(c.accountNumber, c.bankCode)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.primary} onPress={handleTossSend}>
        <Send size={18} color="#fff" strokeWidth={2.2} />
        <Text style={styles.primaryText}>토스로 송금하기</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={handleCopy}>
          <CopyIcon size={16} color="#007aff" strokeWidth={2.2} />
          <Text style={styles.secondaryText}>계좌번호 복사</Text>
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
      </View>

      <TouchableOpacity
        style={styles.tertiary}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.tertiaryText}>완료</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType,
  big,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  big?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        {icon}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType ?? 'default'}
        style={[styles.input, big && styles.inputBig]}
      />
    </View>
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
    paddingVertical: 12,
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    gap: 12,
  },
  field: { gap: 4 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 12, color: '#666' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  inputBig: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  candidatesBox: {
    padding: 14,
    backgroundColor: '#fff7e8',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f5d59c',
  },
  candidatesTitle: {
    fontSize: 12,
    color: '#a36b00',
    fontWeight: '600',
  },
  candidateRow: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  candidateBank: { fontSize: 12, color: '#666', marginBottom: 2 },
  candidateNum: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Menlo',
  },
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
    flex: 1,
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
  tertiary: { paddingVertical: 12, alignItems: 'center' },
  tertiaryText: { color: '#666', fontSize: 14 },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
