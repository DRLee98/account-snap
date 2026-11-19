import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Path, Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import ImageEditor from '@react-native-community/image-editor';
import Clipboard from '@react-native-clipboard/clipboard';
import { ChevronLeft, CircleAlert, Undo2 } from 'lucide-react-native';
import { recognizeAccount } from '../services/ocr';
import { createAccount } from '../services/storage';
import { RootStackParamList } from '../navigation/types';
import {
  canRead,
  Point,
  Stroke,
  strokesBounds,
  strokesToPath,
} from '../services/crop/strokes';
import { COLORS } from '../theme/colors';

/** 못 읽었을 때 화면 안에 띄우는 안내 */
type Failure = { title: string; desc: string };

const NOT_FOUND: Failure = {
  title: '칠한 곳에서 계좌번호를 찾지 못했어요',
  desc: '숫자가 모두 칠해졌는지 확인하고 다시 읽어 주세요.\n글씨가 흐리면 가까이서 다시 찍으면 잘 읽혀요.',
};
const READ_ERROR: Failure = {
  title: '계좌번호를 읽지 못했어요',
  desc: '인터넷 연결을 확인하고 다시 읽어 주세요.',
};

const PADDING = 12;
const BRUSH_SIZE = 36;

export default function CropScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Crop'>>();
  const insets = useSafeAreaInsets();
  const sourceUri = route.params.sourceUri;

  const captureBoxRef = useRef<View>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  // 손을 뗐다 다시 칠하면 새 획 — 은행명·계좌번호가 다른 줄이어도 나눠 칠할 수 있다
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const strokesRef = useRef<Stroke[]>([]);

  if (!imgNaturalSize) {
    Image.getSize(sourceUri, (w, h) => setImgNaturalSize({ w, h }));
  }

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!layout || layout.w !== width || layout.h !== height) {
      setLayout({ w: width, h: height });
    }
  };

  const fitted = useMemo(() => {
    if (!imgNaturalSize || !layout) return null;
    const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
    const boxRatio = layout.w / layout.h;
    let dispW: number;
    let dispH: number;
    if (imgRatio > boxRatio) {
      dispW = layout.w;
      dispH = layout.w / imgRatio;
    } else {
      dispH = layout.h;
      dispW = layout.h * imgRatio;
    }
    return {
      w: dispW,
      h: dispH,
      offsetX: (layout.w - dispW) / 2,
      offsetY: (layout.h - dispH) / 2,
    };
  }, [imgNaturalSize, layout]);

  // Android에서는 RNGH(GestureHandlerRootView)가 드래그 도중 RN responder를
  // 강제 취소(terminate)해서 PanResponder로는 붓질이 한 점 이상 쌓이지 않았다.
  // RNGH가 이미 루트에 있으므로 RNGH 제스처를 그대로 쓴다. (iOS는 기존과 동일 동작)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin(e => {
          const start: Point = { x: e.x, y: e.y };
          strokesRef.current = [...strokesRef.current, [start]];
          setStrokes(strokesRef.current);
          setFailure(null);
        })
        .onUpdate(e => {
          const current = strokesRef.current[strokesRef.current.length - 1];
          if (!current) return;
          current.push({ x: e.x, y: e.y });
          if (current.length % 3 === 0) setStrokes([...strokesRef.current]);
        })
        .onFinalize(() => {
          setStrokes([...strokesRef.current]);
        }),
    [],
  );

  const pathData = useMemo(() => strokesToPath(strokes), [strokes]);
  const readable = canRead(strokes);

  const updateStrokes = (next: Stroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
    setFailure(null);
  };
  const handleUndo = () => updateStrokes(strokesRef.current.slice(0, -1));
  const handleClear = () => updateStrokes([]);

  const produceCroppedUri = async (): Promise<string | null> => {
    const bounds = fitted
      ? strokesBounds(strokes, BRUSH_SIZE / 2 + PADDING, fitted)
      : null;
    if (!fitted || !imgNaturalSize || !readable || !bounds) return null;
    setIsCapturing(true);
    await new Promise(r => requestAnimationFrame(() => r(null)));
    await new Promise(r => requestAnimationFrame(() => r(null)));
    try {
      const capturedRaw = await captureRef(captureBoxRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const captured = capturedRaw.startsWith('file://')
        ? capturedRaw
        : `file://${capturedRaw}`;

      const { minX, minY, maxX, maxY } = bounds;

      const pr = PixelRatio.get();
      const cropData = {
        offset: {
          x: Math.round(minX * pr),
          y: Math.round(minY * pr),
        },
        size: {
          width: Math.round((maxX - minX) * pr),
          height: Math.round((maxY - minY) * pr),
        },
      };

      const cropped = await ImageEditor.cropImage(captured, cropData);
      return typeof cropped === 'string' ? cropped : (cropped as any).uri;
    } finally {
      setIsCapturing(false);
    }
  };

  const runOCR = async (uri: string) => {
    // CLOVA 우선, CLOVA 호출이 실패했을 때만 기기 OCR
    const result = await recognizeAccount(uri);
    if (!result) {
      setFailure(NOT_FOUND);
      return;
    }
    const { parsed, rawText: ocrRawText, regionUnit } = result;
    const account = createAccount({
      accountNumber: parsed.accountNumber,
      bankName: parsed.bankName || '(은행 미확인)',
      bankCode: parsed.bankCode,
      holderName: parsed.holderName,
      sourceImageUri: uri,
      originalImageUri: sourceUri,
      ocrRawText,
    });
    // 복사됐다는 알림은 결과 화면의 "목록에 저장" 알림이 함께 알려 준다
    Clipboard.setString(parsed.accountNumber);
    const { candidates, ...primary } = parsed;
    navigation.replace('Result', {
      accountId: account.id,
      options: [primary, ...(candidates ?? [])],
      regionUnit,
    });
  };

  const handleRead = async () => {
    setFailure(null);
    setLoading(true);
    try {
      const uri = await produceCroppedUri();
      if (!uri) return;
      await runOCR(uri);
    } catch {
      setFailure(READ_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="다시 찍기"
        >
          <ChevronLeft size={24} color="#fff" strokeWidth={2.2} />
          <Text style={styles.backText}>다시 찍기</Text>
        </TouchableOpacity>
        <Text style={styles.title}>계좌번호 칠하기</Text>
      </View>

      <View style={styles.imageBox} onLayout={onContainerLayout}>
        {fitted && (
          <GestureDetector gesture={panGesture}>
            <View
              ref={captureBoxRef}
              collapsable={false}
              style={{
                position: 'absolute',
                left: fitted.offsetX,
                top: fitted.offsetY,
                width: fitted.w,
                height: fitted.h,
              }}
            >
              <Image
                source={{ uri: sourceUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
              />
              {pathData && (
                <Svg
                  style={StyleSheet.absoluteFill}
                  width={fitted.w}
                  height={fitted.h}
                  pointerEvents="none"
                >
                  {isCapturing ? (
                    <>
                      <Defs>
                        <Mask id="brushMask">
                          <Rect
                            x={0}
                            y={0}
                            width={fitted.w}
                            height={fitted.h}
                            fill="white"
                          />
                          <Path
                            d={pathData}
                            stroke="black"
                            strokeWidth={BRUSH_SIZE}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </Mask>
                      </Defs>
                      <Rect
                        x={0}
                        y={0}
                        width={fitted.w}
                        height={fitted.h}
                        fill="white"
                        mask="url(#brushMask)"
                      />
                    </>
                  ) : (
                    <Path
                      d={pathData}
                      stroke="#FFD400"
                      strokeOpacity={0.3}
                      strokeWidth={BRUSH_SIZE}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </Svg>
              )}
            </View>
          </GestureDetector>
        )}

        {failure ? (
          <View style={styles.failure} accessibilityRole="alert">
            <CircleAlert size={18} color="#a36b00" strokeWidth={2.2} />
            <View style={styles.failureTexts}>
              <Text style={styles.failureTitle}>{failure.title}</Text>
              <Text style={styles.failureDesc}>{failure.desc}</Text>
            </View>
          </View>
        ) : (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hint}>
              은행명과 계좌번호를 칠해 주세요 · 여러 번 나눠 칠해도 돼요
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.outlineBtn, strokes.length === 0 && styles.dim]}
          onPress={handleUndo}
          disabled={strokes.length === 0 || loading}
          accessibilityRole="button"
        >
          <Undo2 size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.outlineText}>되돌리기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.outlineBtn, strokes.length === 0 && styles.dim]}
          onPress={handleClear}
          disabled={strokes.length === 0 || loading}
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>전체 지우기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.readBtn, !readable && styles.dim]}
          onPress={handleRead}
          disabled={!readable || loading}
          accessibilityRole="button"
        >
          <Text style={styles.readText}>
            {failure ? '다시 읽기' : '계좌 읽기'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard} accessibilityRole="progressbar">
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingTitle}>칠한 곳을 읽고 있어요</Text>
            <Text style={styles.loadingDesc}>보통 1~2초면 끝나요</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  topBar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 4,
    top: 4,
    height: 44,
    paddingLeft: 4,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: { color: '#fff', fontSize: 15 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  imageBox: { flex: 1, position: 'relative' },
  hintWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 13,
  },
  failure: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff6e5',
  },
  failureTexts: { flex: 1, gap: 2 },
  failureTitle: { fontSize: 14, fontWeight: '700', color: '#8a5300' },
  failureDesc: { fontSize: 12, lineHeight: 17, color: '#8a5300' },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: '#000',
  },
  outlineBtn: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  readBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primaryOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dim: { opacity: 0.35 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    width: 260,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(28,28,30,0.95)',
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loadingDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
});
