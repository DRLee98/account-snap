import { StyleSheet, Text, View } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';
import { Check } from 'lucide-react-native';

/**
 * 기본 토스트(success 등)는 그대로 두고 추가하는 모양.
 * - saved: 결과 화면 "목록에 저장했어요" — 위에서 내려왔다 사라지는 초록 캡슐
 */
export const toastConfig: ToastConfig = {
  saved: ({ text1 }) => (
    <View style={styles.capsule} accessibilityRole="alert">
      <Check size={15} color="#1d7a3a" strokeWidth={2.6} />
      <Text style={styles.capsuleText}>{text1}</Text>
    </View>
  ),
};

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingLeft: 11,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: '#e7f6ec',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  capsuleText: { fontSize: 13, fontWeight: '600', color: '#1d7a3a' },
});
