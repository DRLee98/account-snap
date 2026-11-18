import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, Copy as CopyIcon, Info } from 'lucide-react-native';
import {
  TransferApp,
  TransferAppId,
  TransferMode,
} from '../services/transfer/apps';
import {
  availableTransferApps,
  getTransferApp,
  setTransferAppId,
} from '../services/transfer/preference';

const ACCENT = '#007aff';

const SECTIONS: { mode: TransferMode; title: string; desc?: string }[] = [
  {
    mode: 'prefill',
    title: '계좌까지 자동으로 입력돼요',
    desc: '은행·계좌번호가 채워진 송금 화면이 열려요',
  },
  { mode: 'copyLaunch', title: '계좌번호를 복사하고 앱을 열어요' },
  { mode: 'copyOnly', title: '앱을 열지 않기' },
];

export default function TransferAppScreen() {
  const [selectedId, setSelectedId] = useState<TransferAppId>(
    () => getTransferApp().id,
  );
  const apps = availableTransferApps();

  const handleSelect = (id: TransferAppId) => {
    setTransferAppId(id);
    setSelectedId(id);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>송금할 때 어떤 앱을 열까요?</Text>
        <Text style={styles.introSub}>
          결과 화면과 계좌 목록의 송금 버튼이 선택한 앱을 열어요.
        </Text>
      </View>

      {SECTIONS.map(section => {
        const items = apps.filter(app => app.mode === section.mode);
        if (items.length === 0) return null;
        return (
          <View key={section.mode} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {section.title}
              </Text>
              {section.desc ? (
                <Text style={styles.sectionDesc}>{section.desc}</Text>
              ) : null}
            </View>
            <View style={styles.group} accessibilityRole="radiogroup">
              {items.map((app, i) => (
                <AppRow
                  key={app.id}
                  app={app}
                  first={i === 0}
                  selected={app.id === selectedId}
                  onPress={() => handleSelect(app.id)}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={styles.note}>
        <Info size={18} color="#666" strokeWidth={2} />
        <Text style={styles.noteText}>
          계좌가 자동으로 채워지는 앱은 토스와 카카오페이예요. 다른 앱은
          계좌번호를 복사한 뒤 열어 드리니, 이체 화면에서 붙여넣기 해 주세요.
        </Text>
      </View>
    </ScrollView>
  );
}

function AppRow({
  app,
  first,
  selected,
  onPress,
}: {
  app: TransferApp;
  first: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={app.hint ? `${app.name}, ${app.hint}` : app.name}
      style={({ pressed }) => [
        styles.row,
        !first && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      {app.icon ? (
        <Image source={app.icon} style={styles.icon} />
      ) : (
        <View style={[styles.icon, styles.iconFallback]}>
          <CopyIcon size={18} color="#444" strokeWidth={2} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.name}>{app.name}</Text>
        {app.hint ? <Text style={styles.hint}>{app.hint}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.checkOn}>
          <Check size={14} color="#fff" strokeWidth={3.2} />
        </View>
      ) : (
        <View style={styles.checkOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 40 },
  intro: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 6 },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    lineHeight: 30,
  },
  introSub: { fontSize: 14, color: '#666', lineHeight: 21 },
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 8 },
  sectionHeader: { paddingHorizontal: 4, gap: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  sectionDesc: { fontSize: 11, color: '#6b6b6b', lineHeight: 15 },
  group: { backgroundColor: '#f4f4f4', borderRadius: 12, overflow: 'hidden' },
  row: {
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d9d9de',
  },
  rowPressed: { backgroundColor: '#ebebef' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d9d9de',
  },
  iconFallback: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '500', color: '#222' },
  hint: { fontSize: 13, color: '#6b6b6b', lineHeight: 18 },
  checkOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8e8e93',
  },
  note: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
});
