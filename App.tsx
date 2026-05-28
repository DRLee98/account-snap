import { useState } from 'react';
import {
  Button,
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';

const STORAGE_KEY = 'poc:lastAccount';
const mmkv = new MMKV({ id: 'account-snap' });

const containerPath: string =
  NativeModules.AppGroup?.containerPath ?? '(unavailable)';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState<string | undefined>(
    mmkv.getString(STORAGE_KEY),
  );

  const handleSave = () => {
    mmkv.set(STORAGE_KEY, input);
    setSaved(input);
  };

  const handleClear = () => {
    mmkv.delete(STORAGE_KEY);
    setSaved(undefined);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>WGT-001 PoC (인프라 검증)</Text>
      <Text style={styles.subtitle}>
        RN 측 MMKV + App Group 인프라 인식 확인
      </Text>

      <TextInput
        style={styles.input}
        placeholder="계좌번호 예: 110-1234-5678-9012"
        value={input}
        onChangeText={setInput}
        autoCorrect={false}
      />

      <View style={styles.row}>
        <Button title="저장" onPress={handleSave} disabled={!input} />
        <View style={styles.gap} />
        <Button title="비우기" onPress={handleClear} color="#c33" />
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>MMKV 저장값 (RN local):</Text>
        <Text style={styles.value}>{saved ?? '(없음)'}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>App Group container path:</Text>
        <Text style={styles.path}>{containerPath}</Text>
      </View>

      <Text style={styles.hint}>
        ※ RN→Native method 호출(setString)은 New Arch Bridgeless에서 TurboModule spec 필요. 본 PoC는 인프라 검증까지 완료. 위젯↔NSUserDefaults App Group 통신은 별도 task(WGT-005)에서 진행.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  gap: { width: 12 },
  box: {
    padding: 14,
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    marginBottom: 10,
  },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600' },
  path: { fontSize: 10, color: '#444', fontFamily: 'Menlo' },
  hint: { fontSize: 11, color: '#999', lineHeight: 17, marginTop: 14 },
});

export default App;
