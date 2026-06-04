import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Pencil, X } from 'lucide-react-native';
import { BANK_PATTERNS } from '../services/ocr';

type Props = {
  visible: boolean;
  current?: string;
  onClose: () => void;
  onSelect: (bankName: string, bankCode?: string) => void;
};

export default function BankPicker({
  visible,
  current,
  onClose,
  onSelect,
}: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleClose = () => {
    setCustomMode(false);
    setCustomValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>은행 선택</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {customMode ? (
            <View style={styles.customBox}>
              <TextInput
                style={styles.customInput}
                value={customValue}
                onChangeText={setCustomValue}
                placeholder="은행명 직접 입력"
                placeholderTextColor="#bbb"
                autoFocus
              />
              <View style={styles.customRow}>
                <TouchableOpacity
                  style={styles.customBackBtn}
                  onPress={() => setCustomMode(false)}
                >
                  <Text style={styles.customBackText}>목록으로</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.customConfirmBtn,
                    !customValue.trim() && { opacity: 0.4 },
                  ]}
                  disabled={!customValue.trim()}
                  onPress={() => {
                    onSelect(customValue.trim(), undefined);
                    handleClose();
                  }}
                >
                  <Text style={styles.customConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={BANK_PATTERNS}
              keyExtractor={b => b.code}
              renderItem={({ item }) => {
                const selected = item.name === current;
                return (
                  <TouchableOpacity
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => {
                      onSelect(item.name, item.code);
                      handleClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        selected && styles.rowTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selected ? (
                      <Check size={18} color="#007aff" strokeWidth={2.4} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.customTrigger}
                  onPress={() => setCustomMode(true)}
                >
                  <Pencil size={16} color="#007aff" strokeWidth={2.2} />
                  <Text style={styles.customTriggerText}>직접 입력</Text>
                </TouchableOpacity>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 10,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 36,
    maxHeight: '70%',
    paddingBottom: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  rowSelected: { backgroundColor: '#f0f7ff' },
  rowText: { fontSize: 15, color: '#333' },
  rowTextSelected: { color: '#007aff', fontWeight: '600' },
  customTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  customTriggerText: { color: '#007aff', fontSize: 15, fontWeight: '500' },
  customBox: { padding: 20, gap: 14 },
  customInput: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#222',
  },
  customRow: { flexDirection: 'row', gap: 10 },
  customBackBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customBackText: { color: '#666', fontSize: 14 },
  customConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#007aff',
  },
  customConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
