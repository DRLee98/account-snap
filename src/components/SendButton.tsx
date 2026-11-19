import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Copy as CopyIcon, Send } from 'lucide-react-native';
import type { TransferApp, TransferAppButton } from '../services/transfer/apps';
import { COLORS } from '../theme/colors';

/** 버튼 아래 줄 설명 — 누르면 무슨 일이 일어나는지 */
export function sendButtonSubtitle(app: TransferApp): string | undefined {
  switch (app.mode) {
    case 'prefill':
      return '은행·계좌번호가 채워진 송금 화면이 열려요';
    case 'copyLaunch':
      return '계좌번호를 복사하고 앱을 열어요';
    default:
      return undefined;
  }
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * boxShadow는 Android 9(API 28)부터 그려진다. 그보다 낮으면 같은 색의 옅은 테두리로 대신한다.
 */
function supportsBoxShadow(): boolean {
  return Platform.OS !== 'android' || Number(Platform.Version) >= 28;
}

export type SendButtonColors = {
  container: ViewStyle;
  title: string;
  subtitle: string;
};

/** 아이콘 배경색 버튼(A안)의 색 — 흰 배경은 대표색 그림자, 진한 배경은 흰 글씨 */
export function sendButtonColors(
  button: TransferAppButton,
  boxShadow = supportsBoxShadow(),
): SendButtonColors {
  const container: ViewStyle = { backgroundColor: button.background };
  if (button.shadow) {
    if (boxShadow) {
      container.boxShadow = `0 2px 8px ${rgba(
        button.shadow,
        0.18,
      )}, 0 0 0 1px ${rgba(button.shadow, 0.1)}`;
    } else {
      container.borderWidth = 1;
      container.borderColor = rgba(button.shadow, 0.25);
      container.padding = 11;
    }
  }
  const dark = button.text === 'dark';
  return {
    container,
    title: dark ? '#191919' : '#ffffff',
    subtitle: dark ? '#333333' : 'rgba(255, 255, 255, 0.85)',
  };
}

type Props = {
  app: TransferApp;
  onPress: () => void;
  /** 아직 누를 수 없을 때(계좌를 고르기 전) — 흐리게 표시하고 누름을 막는다 */
  disabled?: boolean;
  /** 아래 줄 설명을 바꿔 쓴다 (기본: 앱 종류에 따른 설명) */
  subtitle?: string;
};

/** 결과 화면의 송금 버튼 — 주거래 앱 아이콘과 아이콘 배경색으로 그린다. 아이콘은 왼쪽, 문구는 가운데 */
export default function SendButton({
  app,
  onPress,
  disabled = false,
  subtitle: subtitleOverride,
}: Props) {
  const subtitle = subtitleOverride ?? sendButtonSubtitle(app);
  const state = { disabled };

  if (!app.icon || !app.button) {
    // 계좌번호만 복사: 앱 기본 파란 버튼
    const Icon = app.mode === 'prefill' ? Send : CopyIcon;
    return (
      <TouchableOpacity
        style={[styles.plain, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={state}
        accessibilityHint={subtitle}
      >
        <View style={styles.plainRow}>
          <Icon size={18} color="#fff" strokeWidth={2.2} />
          <Text style={styles.plainText}>{app.sendLabel}</Text>
        </View>
        {subtitle ? <Text style={styles.plainSub}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  }

  const colors = sendButtonColors(app.button);
  return (
    <TouchableOpacity
      style={[styles.brand, colors.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={state}
      accessibilityRole="button"
      accessibilityLabel={app.sendLabel}
      accessibilityHint={subtitle}
    >
      <Image source={app.icon} style={styles.icon} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.title }]} numberOfLines={1}>
          {app.sendLabel}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.subtitle }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const ICON_SIZE = 36;

const styles = StyleSheet.create({
  brand: {
    minHeight: 60,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: 9 },
  // 아이콘은 왼쪽에 두고 문구는 버튼 가운데 — 오른쪽에 아이콘 폭만큼 비워 버튼 전체 기준으로 가운데를 맞춘다
  texts: {
    flex: 1,
    minWidth: 0,
    marginRight: ICON_SIZE,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  subtitle: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  plain: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plainRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plainText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  plainSub: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 12 },
});
