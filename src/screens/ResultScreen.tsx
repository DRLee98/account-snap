import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Pencil,
} from 'lucide-react-native';
import AccountPhoto, { REGION_COLORS } from '../components/AccountPhoto';
import AdFitBanner, { AD_CLIENT_IDS } from '../components/AdFitBanner';
import BankPicker from '../components/BankPicker';
import SendButton from '../components/SendButton';
import { Account, normalizeAccountNumber } from '../models/account';
import {
  deleteAccount,
  getAccount,
  markUsed,
  updateAccount,
} from '../services/storage';
import { sendWithApp } from '../services/transfer/send';
import { getTransferApp } from '../services/transfer/preference';
// 바렐(services/ocr) 대신 직접 가져온다 — CLOVA 클라이언트(react-native-config)까지 끌려오지 않게
import {
  BANK_PATTERNS,
  formatAccountByBank,
  inferBankByAccountNumber,
  isPhoneFormatNumber,
  matchesBankFormat,
} from '../services/ocr/bankPatterns';
import type { ParsedAccount } from '../services/ocr/types';
import { RootStackParamList } from '../navigation/types';

export const UNKNOWN_BANK = '(은행 미확인)';
const WARN = '#d26a00';
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

const isUnknownBank = (name?: string) => !name?.trim() || name === UNKNOWN_BANK;

type Phase = 'pick' | 'confirm';

/**
 * 결과 화면 (APP-012).
 * - 확인 카드: 값을 눌러 고친다. 은행은 목록 시트, 복사는 번호 옆, 송금 버튼은 아래 고정
 * - 사진에 은행·계좌번호·예금주를 읽은 자리를 색 상자로, 카드 라벨 앞 점도 같은 색
 * - 확인이 필요할 때만 묻기: 계좌가 여러 개면 먼저 고르기, 은행을 추정했으면 주황색으로 표시
 */
export default function ResultScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const options: ParsedAccount[] = route.params.options ?? [];
  const regionUnit = route.params.regionUnit ?? 'px';

  const [account, setAccount] = useState<Account | undefined>(() =>
    getAccount(route.params.accountId),
  );
  const [phase, setPhase] = useState<Phase>(
    options.length > 1 ? 'pick' : 'confirm',
  );
  const [picked, setPicked] = useState(0);
  // 사진 글자에 은행이 없어 계좌번호로 추정한 은행 — 고치지 않고 송금하면 이 은행으로 넘긴다
  const [bankGuessed, setBankGuessed] = useState(!!options[0]?.bankInferred);
  const [accountNumber, setAccountNumber] = useState(
    account ? formatAccountByBank(account.accountNumber, account.bankCode) : '',
  );
  const [holderName, setHolderName] = useState(account?.holderName ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [transferApp, setTransferApp] = useState(getTransferApp);

  // 주거래 은행 화면에서 돌아오면 버튼을 갱신
  useFocusEffect(
    useCallback(() => {
      setTransferApp(getTransferApp());
    }, []),
  );

  // 키보드가 올라오면 아래 송금 버튼은 잠시 숨긴다 (입력칸이 가려지지 않게)
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardShown(true),
    );
    const hide = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardShown(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const showSaved = useCallback(() => {
    Toast.show({
      type: 'saved',
      text1: '목록에 저장하고 계좌번호를 복사했어요',
      position: 'top',
      topOffset: insets.top + HEADER_HEIGHT + 8,
      visibilityTime: 2500,
    });
  }, [insets.top]);

  // 계좌가 하나면 들어오자마자, 여러 개면 고른 뒤에 저장 알림을 띄운다
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || !account || phase !== 'confirm') return;
    announced.current = true;
    showSaved();
  }, [account, phase, showSaved]);

  if (!account) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>계좌를 찾을 수 없어요</Text>
      </View>
    );
  }

  const persist = (patch: Partial<Account>) => {
    const updated = updateAccount(account.id, patch);
    if (updated) setAccount(updated);
    return updated;
  };

  const bankUnknown = isUnknownBank(account.bankName);
  const bankNeedsCheck = bankGuessed || bankUnknown;
  const digits = account.accountNumber;

  const handlePick = (index: number) => {
    const o = options[index];
    persist({
      accountNumber: o.accountNumber,
      bankName: o.bankName || UNKNOWN_BANK,
      bankCode: o.bankCode,
      holderName: o.holderName,
    });
    setAccountNumber(formatAccountByBank(o.accountNumber, o.bankCode));
    setHolderName(o.holderName ?? '');
    setBankGuessed(!!o.bankInferred);
    setPicked(index);
    setPhase('confirm');
    Clipboard.setString(o.accountNumber);
    announced.current = true;
    showSaved();
  };

  const handleSelectBank = (bankName: string, bankCode?: string) => {
    persist({ bankName, bankCode });
    setBankGuessed(false);
    setAccountNumber(formatAccountByBank(account.accountNumber, bankCode));
  };

  const handleAccountBlur = () => {
    const normalized = normalizeAccountNumber(accountNumber);
    if (normalized === account.accountNumber || normalized.length < 8) {
      setAccountNumber(
        formatAccountByBank(account.accountNumber, account.bankCode),
      );
      return;
    }
    const patch: Partial<Account> = { accountNumber: normalized };
    // 은행이 추정값이거나 비어 있으면 바뀐 번호로 다시 추정한다
    if (bankNeedsCheck) {
      const inferred = inferBankByAccountNumber(normalized);
      patch.bankName = inferred?.name ?? UNKNOWN_BANK;
      patch.bankCode = inferred?.code;
      setBankGuessed(!!inferred);
    }
    const updated = persist(patch);
    setAccountNumber(formatAccountByBank(normalized, updated?.bankCode));
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
    Toast.show({
      type: 'success',
      text1: '계좌번호 복사됨',
      text2: formatAccountByBank(account.accountNumber, account.bankCode),
      visibilityTime: 1000,
    });
  };

  const openTransferAppSettings = () => navigation.navigate('TransferApp');

  const handleSend = async () => {
    const result = await sendWithApp(transferApp, account, {
      onChooseOtherApp: openTransferAppSettings,
    });
    if (result !== 'failed') markUsed(account.id);
  };

  const handleRedo = account.originalImageUri
    ? () => {
        const uri = account.originalImageUri!;
        deleteAccount(account.id);
        navigation.replace('Crop', { sourceUri: uri });
      }
    : undefined;

  const regions = phase === 'confirm' ? options[picked]?.regions : undefined;
  const hasRegions = !!regions && Object.keys(regions).length > 0;

  const sendSubtitle =
    phase === 'pick'
      ? '보낼 계좌를 골라 주세요'
      : bankUnknown && transferApp.mode === 'prefill'
      ? '은행을 고르면 계좌까지 채워진 화면이 열려요'
      : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + HEADER_HEIGHT}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AccountPhoto
          uri={account.sourceImageUri}
          regions={regions}
          regionUnit={regionUnit}
          onRedo={handleRedo}
        />

        {phase === 'pick' ? (
          <>
            <Notice
              title={`사진에서 계좌가 ${options.length}개 보여요`}
              desc="보낼 계좌를 골라 주세요. 고른 계좌만 목록에 남아요."
            />
            {options.map((o, i) => (
              <Pressable
                key={`${o.accountNumber}-${i}`}
                style={styles.pickCard}
                onPress={() => handlePick(i)}
                accessibilityRole="button"
              >
                <View style={styles.pickTexts}>
                  <Text style={styles.pickBank}>
                    {o.bankName || '(은행 미상)'}
                  </Text>
                  <Text style={styles.pickNumber}>
                    {formatAccountByBank(o.accountNumber, o.bankCode)}
                  </Text>
                  {o.holderName ? (
                    <Text style={styles.pickHolder}>예금주 {o.holderName}</Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color="#b4b4ba" strokeWidth={2.2} />
              </Pressable>
            ))}
            <Text style={styles.hint}>
              누르면 계좌 정보를 확인하고 고칠 수 있어요
            </Text>
          </>
        ) : (
          <>
            {options.length > 1 ? (
              <Pressable
                style={styles.switchRow}
                onPress={() => setPhase('pick')}
                accessibilityRole="button"
              >
                <Text style={styles.switchText}>
                  사진에서 계좌 {options.length}개를 찾았어요
                </Text>
                <Text style={styles.switchAction}>다른 계좌로 바꾸기</Text>
                <ChevronRight size={14} color="#007aff" strokeWidth={2.4} />
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <Pressable
                style={[styles.row, styles.rowDivider]}
                onPress={() => setBankPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`은행 ${
                  bankUnknown ? '선택 안 됨' : account.bankName
                }, 바꾸기`}
              >
                <Dot color={REGION_COLORS.bank} hollow={bankNeedsCheck} />
                <Text style={styles.rowLabel}>은행</Text>
                <Text
                  style={[styles.bankValue, bankNeedsCheck && styles.warnText]}
                  numberOfLines={1}
                >
                  {bankUnknown ? '선택해 주세요' : account.bankName}
                </Text>
                <ChevronRight
                  size={16}
                  color={bankNeedsCheck ? WARN : '#b4b4ba'}
                  strokeWidth={2.2}
                />
              </Pressable>
              {bankNeedsCheck ? (
                <Text style={styles.bankNote}>
                  {bankUnknown
                    ? '사진에서 은행을 찾지 못했어요.\n고르면 송금 앱에 계좌까지 채워져요'
                    : '사진에 은행이 없어 계좌번호로 추정했어요.\n다른 은행이면 눌러서 바꿔 주세요'}
                </Text>
              ) : null}

              <View style={[styles.numberBlock, styles.rowDivider]}>
                <View style={styles.numberLabelRow}>
                  <Dot color={REGION_COLORS.number} />
                  <Text style={styles.smallLabel}>계좌번호</Text>
                </View>
                <View style={styles.numberRow}>
                  <TextInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    onBlur={handleAccountBlur}
                    keyboardType="number-pad"
                    style={styles.numberInput}
                    accessibilityLabel="계좌번호"
                  />
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopy}
                    accessibilityRole="button"
                    accessibilityLabel="계좌번호 복사"
                  >
                    <Text style={styles.copyText}>복사</Text>
                  </TouchableOpacity>
                </View>
                {bankNeedsCheck ? null : (
                  <FormatCheck digits={digits} bankCode={account.bankCode} />
                )}
              </View>

              <View style={[styles.row, styles.rowDivider]}>
                <Dot color={REGION_COLORS.holder} />
                <Text style={styles.rowLabel}>예금주</Text>
                <TextInput
                  value={holderName}
                  onChangeText={setHolderName}
                  onBlur={handleHolderBlur}
                  placeholder="(선택) 홍길동"
                  placeholderTextColor="#b4b4ba"
                  style={styles.rowInput}
                  accessibilityLabel="예금주"
                />
                <Pencil size={15} color="#b4b4ba" strokeWidth={2} />
              </View>

              <View style={styles.row}>
                <Dot />
                <Text style={styles.rowLabel}>별칭</Text>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  onBlur={handleLabelBlur}
                  placeholder="(선택) 자주 가는 분식집"
                  placeholderTextColor="#b4b4ba"
                  style={styles.rowInput}
                  accessibilityLabel="별칭"
                />
                <Pencil size={15} color="#b4b4ba" strokeWidth={2} />
              </View>
            </View>

            <Text style={styles.hint}>
              {hasRegions
                ? '사진의 같은 색 상자에서 읽은 값이에요 · 눌러서 고칠 수 있어요'
                : '잘못 읽은 값은 눌러서 고칠 수 있어요'}
            </Text>
          </>
        )}

        {AD_CLIENT_IDS.result ? (
          <View style={styles.adWrap}>
            <AdFitBanner
              clientId={AD_CLIENT_IDS.result}
              width={320}
              height={100}
            />
          </View>
        ) : null}
      </ScrollView>

      {keyboardShown ? null : (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <SendButton
            app={transferApp}
            onPress={handleSend}
            disabled={phase === 'pick'}
            subtitle={sendSubtitle}
          />
          <TouchableOpacity
            style={styles.changeRow}
            onPress={openTransferAppSettings}
            accessibilityRole="button"
            accessibilityLabel={`주거래 은행 ${transferApp.name}, 변경`}
          >
            <Text style={styles.changeLabel}>
              주거래 은행 · {transferApp.name}
            </Text>
            <Text style={styles.changeAction}>변경</Text>
            <ChevronRight size={14} color="#0062cc" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      )}

      <BankPicker
        visible={bankPickerOpen}
        current={bankUnknown ? undefined : account.bankName}
        onClose={() => setBankPickerOpen(false)}
        onSelect={handleSelectBank}
      />
    </KeyboardAvoidingView>
  );
}

/** 카드 라벨 앞 점 — 사진 상자와 같은 색. hollow는 사진에서 못 찾은 값(주황 테두리) */
function Dot({ color, hollow }: { color?: string; hollow?: boolean }) {
  if (hollow) return <View style={[styles.dot, styles.dotHollow]} />;
  return (
    <View
      style={[styles.dot, color ? { backgroundColor: color } : styles.dotSpace]}
    />
  );
}

function Notice({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <CircleAlert size={18} color="#a36b00" strokeWidth={2.2} />
      <View style={styles.noticeTexts}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeDesc}>{desc}</Text>
      </View>
    </View>
  );
}

/** 은행의 알려진 자릿수와 맞는지 — 맞으면 확인 표시, 다르면 다시 보라고 알린다 */
export function FormatCheck({
  digits,
  bankCode,
}: {
  digits: string;
  bankCode?: string;
}) {
  const bank = BANK_PATTERNS.find(b => b.code === bankCode);
  if (!bank?.lengths || isPhoneFormatNumber(digits)) return null;
  const ok = matchesBankFormat(digits, bankCode);
  return (
    <View style={styles.formatRow}>
      {ok ? (
        <CircleCheck size={14} color="#1d7a3a" strokeWidth={2.2} />
      ) : (
        <CircleAlert size={14} color={WARN} strokeWidth={2.2} />
      )}
      <Text style={[styles.formatText, ok ? styles.okText : styles.warnText]}>
        {ok
          ? `${bank.name} 계좌번호 형식(${digits.length}자리)과 맞아요`
          : `${bank.name} 계좌번호 형식과 달라요. 번호를 확인해 주세요`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2f2f2' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 14, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#666' },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f2d49b',
    backgroundColor: '#fff6e5',
  },
  noticeTexts: { flex: 1, gap: 2 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#8a5300' },
  noticeDesc: { fontSize: 12, lineHeight: 17, color: '#8a5300' },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dedee3',
    backgroundColor: '#fff',
  },
  pickTexts: { flex: 1, gap: 2 },
  pickBank: { fontSize: 13, color: '#666' },
  pickNumber: { fontSize: 20, fontWeight: '700', color: '#222' },
  pickHolder: { fontSize: 12, color: '#8e8e93' },
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchText: { flex: 1, fontSize: 13, color: '#555' },
  switchAction: { fontSize: 13, fontWeight: '600', color: '#007aff' },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#f0f0f2' },
  rowLabel: { width: 52, fontSize: 13, color: '#8e8e93' },
  rowInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#222' },
  bankValue: { flex: 1, fontSize: 16, fontWeight: '600', color: '#222' },
  bankNote: {
    // 점 8 + 간격 8 + 라벨 52 + 간격 8
    paddingLeft: 76,
    paddingBottom: 12,
    marginTop: -6,
    fontSize: 11,
    lineHeight: 16,
    color: '#8e8e93',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f2',
  },
  warnText: { color: WARN },
  okText: { color: '#1d7a3a' },
  numberBlock: { paddingVertical: 12, gap: 4 },
  numberLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallLabel: { fontSize: 12, color: '#8e8e93' },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numberInput: {
    flex: 1,
    paddingVertical: 2,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#222',
  },
  copyBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
  },
  copyText: { fontSize: 14, fontWeight: '600', color: '#007aff' },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  formatText: { flex: 1, fontSize: 11, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotHollow: { borderWidth: 2, borderColor: '#ff9500' },
  dotSpace: { backgroundColor: 'transparent' },
  hint: { fontSize: 11, color: '#999', textAlign: 'center' },
  adWrap: { marginTop: 4, alignItems: 'center' },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  changeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  changeLabel: { fontSize: 13, color: '#555' },
  changeAction: { fontSize: 13, fontWeight: '600', color: '#0062cc' },
});
