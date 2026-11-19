import { useEffect, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paintbrush, X, ZoomIn } from 'lucide-react-native';
import {
  AccountRegions,
  normalizeRect,
  Rect,
  RegionUnit,
} from '../services/ocr/regions';

/** 사진 위 상자와 카드 라벨 앞 점에 같은 색을 쓴다 */
export const REGION_COLORS = {
  bank: '#34a853',
  number: '#007aff',
  holder: '#8e44ad',
} as const;

const REGION_LABELS: Record<keyof AccountRegions, string> = {
  bank: '은행',
  number: '계좌번호',
  holder: '예금주',
};

export const PHOTO_HEIGHT = 160;
const OUTLINE_GAP = 3;
const TAG_HEIGHT = 16;

type Props = {
  uri?: string;
  regions?: AccountRegions;
  regionUnit?: RegionUnit;
  onRedo?: () => void;
};

type Size = { width: number; height: number };

/** 사진을 상자 안에 다 보이게(contain) 놓았을 때 실제로 그려지는 자리 */
export function containFrame(box: Size, image: Size) {
  const scale = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: (box.width - width) / 2,
    y: (box.height - height) / 2,
    width,
    height,
  };
}

/** 결과 화면 상단 사진 — 은행·계좌번호·예금주를 읽은 자리를 색 상자로 표시한다 */
export default function AccountPhoto({
  uri,
  regions,
  regionUnit = 'px',
  onRedo,
}: Props) {
  const insets = useSafeAreaInsets();
  const [boxWidth, setBoxWidth] = useState(0);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!uri) return;
    let alive = true;
    Image.getSize(
      uri,
      (width, height) => alive && setImageSize({ width, height }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxWidth(e.nativeEvent.layout.width);

  const frame =
    imageSize && boxWidth > 0
      ? containFrame({ width: boxWidth, height: PHOTO_HEIGHT }, imageSize)
      : null;

  const overlays =
    frame && imageSize && regions
      ? (Object.keys(REGION_LABELS) as (keyof AccountRegions)[]).flatMap(
          key => {
            const rect = regions[key];
            if (!rect) return [];
            const n: Rect = normalizeRect(
              rect,
              regionUnit,
              imageSize.width,
              imageSize.height,
            );
            const left = frame.x + n.x * frame.width - OUTLINE_GAP;
            const top = frame.y + n.y * frame.height - OUTLINE_GAP;
            const width = n.width * frame.width + OUTLINE_GAP * 2;
            const height = n.height * frame.height + OUTLINE_GAP * 2;
            // 위에 자리가 없으면 상자 아래에 이름표를 단다
            const tagAbove = top >= TAG_HEIGHT + 2;
            return [
              <View
                key={key}
                pointerEvents="none"
                testID={`region-${key}`}
                style={[
                  styles.outline,
                  {
                    left,
                    top,
                    width,
                    height,
                    borderColor: REGION_COLORS[key],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tag,
                    { backgroundColor: REGION_COLORS[key] },
                    tagAbove ? styles.tagAbove : styles.tagBelow,
                  ]}
                >
                  {REGION_LABELS[key]}
                </Text>
              </View>,
            ];
          },
        )
      : null;

  return (
    <View style={styles.box} onLayout={onLayout}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          accessibilityLabel="칠한 영역만 잘라낸 계좌 사진"
        />
      ) : null}
      {overlays}
      {uri ? (
        <TouchableOpacity
          style={[styles.chip, styles.chipLeft]}
          onPress={() => setZoomed(true)}
          accessibilityRole="button"
        >
          <ZoomIn size={14} color="#555" strokeWidth={2} />
          <Text style={styles.chipText}>크게 보기</Text>
        </TouchableOpacity>
      ) : null}
      {onRedo ? (
        <TouchableOpacity
          style={[styles.chip, styles.chipRight]}
          onPress={onRedo}
          accessibilityRole="button"
        >
          <Paintbrush size={14} color="#555" strokeWidth={2} />
          <Text style={styles.chipText}>다시 칠하기</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={zoomed}
        animationType="fade"
        onRequestClose={() => setZoomed(false)}
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomed(false)}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
          <TouchableOpacity
            style={[styles.zoomClose, { top: insets.top + 8 }]}
            onPress={() => setZoomed(false)}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: PHOTO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e9e6df',
  },
  outline: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  tag: {
    position: 'absolute',
    left: -2,
    height: TAG_HEIGHT,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: TAG_HEIGHT,
  },
  tagAbove: { top: -TAG_HEIGHT - 3 },
  tagBelow: { bottom: -TAG_HEIGHT - 3 },
  chip: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  chipLeft: { left: 10 },
  chipRight: { right: 10 },
  chipText: { fontSize: 10, fontWeight: '500', color: '#555' },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  zoomImage: { width: '100%', height: '80%' },
  zoomClose: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
