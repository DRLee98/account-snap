import { requireNativeComponent, StyleSheet, View, ViewStyle } from 'react-native';

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
  cornerRadius = 10,
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
