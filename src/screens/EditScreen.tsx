import { ReactNode, useState } from 'react';
import {
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
import { Building2, ChevronDown, Tag, User } from 'lucide-react-native';
import { Account, normalizeAccountNumber } from '../models/account';
import { getAccount, updateAccount } from '../services/storage';
import {
  formatAccountByBank,
  inferBankByAccountNumber,
} from '../services/ocr';
import BankPicker from '../components/BankPicker';
import { RootStackParamList } from '../navigation/types';

export default function EditScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Edit'>>();
  const [account, setAccount] = useState<Account | undefined>(() =>
    getAccount(route.params.accountId),
  );

  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(
    account ? formatAccountByBank(account.accountNumber, account.bankCode) : '',
  );
  const [holderName, setHolderName] = useState(account?.holderName ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

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

  const handleBankSelect = (name: string, code?: string) => {
    setBankName(name);
    persist({ bankName: name || '(은행 미확인)', bankCode: code });
    // 새 은행 코드로 계좌번호 표시 포맷 갱신
    const normalized = normalizeAccountNumber(accountNumber);
    setAccountNumber(formatAccountByBank(normalized, code));
  };

  const handleAccountBlur = () => {
    const normalized = normalizeAccountNumber(accountNumber);
    if (normalized === account.accountNumber) return;
    if (normalized.length < 8) return;
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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.field}>
          <View style={styles.fieldLabel}>
            <Building2 size={16} color="#666" strokeWidth={2} />
            <Text style={styles.fieldLabelText}>은행</Text>
          </View>
          <Pressable
            style={styles.bankSelect}
            onPress={() => setBankPickerOpen(true)}
          >
            <Text
              style={[
                styles.bankSelectText,
                !bankName && styles.bankSelectPlaceholder,
              ]}
            >
              {bankName || '은행을 선택해주세요'}
            </Text>
            <ChevronDown size={18} color="#999" strokeWidth={2} />
          </Pressable>
        </View>
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

      <TouchableOpacity
        style={styles.done}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneText}>완료</Text>
      </TouchableOpacity>

      <BankPicker
        visible={bankPickerOpen}
        current={bankName}
        onClose={() => setBankPickerOpen(false)}
        onSelect={handleBankSelect}
      />
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
  icon?: ReactNode;
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  onBlur: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  big?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        {icon}
        <Text style={styles.fieldLabelText}>{label}</Text>
      </View>
      <TextInput
        style={[styles.input, big && styles.inputBig]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#666' },
  card: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabelText: { fontSize: 13, color: '#666' },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#222',
  },
  inputBig: { fontSize: 22, fontWeight: '700' },
  done: { paddingVertical: 12, alignItems: 'center' },
  doneText: { color: '#666', fontSize: 14 },
  bankSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bankSelectText: { fontSize: 16, color: '#222' },
  bankSelectPlaceholder: { color: '#bbb' },
});
