import {
  Platform,
  requireNativeComponent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Config from 'react-native-config';

/**
 * 화면별 광고 단위 코드. AdFit은 플랫폼·사이즈마다 코드를 따로 발급한다.
 * 미발급이면 빈 문자열 → 배너를 렌더하지 않는다.
 */
export const AD_CLIENT_IDS = {
  /** 카메라 화면 상단 320x50 */
  camera:
    Platform.select({
      ios: Config.ADFIT_IOS_CLIENT_ID,
      android: Config.ADFIT_ANDROID_CLIENT_ID,
    }) ?? '',
  /** 결과 화면 하단 320x100 */
  result:
    Platform.select({
      ios: Config.ADFIT_IOS_RESULT_CLIENT_ID,
      android: Config.ADFIT_ANDROID_RESULT_CLIENT_ID,
    }) ?? '',
};

type NativeProps = {
  clientId: string;
  adWidth: number;
  adHeight: number;
  cornerRadius?: number;
  style?: ViewStyle;
};

const NativeAdFitBanner =
  requireNativeComponent<NativeProps>('AdFitBannerView');

type Props = {
  clientId: string;
  width?: number;
  height?: number;
  cornerRadius?: number;
};

export default function AdFitBanner({
  clientId,
  width = 320,
  height = 50,
  cornerRadius = 0,
}: Props) {
  return (
    <View style={[styles.container, { width, height }]}>
      <NativeAdFitBanner
        clientId={clientId}
        adWidth={width}
        adHeight={height}
        cornerRadius={cornerRadius}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', backgroundColor: 'transparent' },
});
