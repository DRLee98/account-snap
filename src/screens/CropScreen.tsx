import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
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
import { captureRef } from 'react-native-view-shot';
import ImageEditor from '@react-native-community/image-editor';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { ChevronLeft, Eraser, Eye, Scissors, X } from 'lucide-react-native';
import { recognize, parseAccount, formatAccountByBank } from '../services/ocr';
import { createAccount } from '../services/storage';
import { RootStackParamList } from '../navigation/types';

type Point = { x: number; y: number };

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
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const pointsRef = useRef<Point[]>([]);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY }];
        setPoints([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: e => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current.push({ x: locationX, y: locationY });
        if (pointsRef.current.length % 3 === 0) {
          setPoints([...pointsRef.current]);
        }
      },
      onPanResponderRelease: () => {
        setPoints([...pointsRef.current]);
      },
    }),
  ).current;

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
      .join(' ');
  }, [points]);

  const handleClear = () => {
    pointsRef.current = [];
    setPoints([]);
    setPreviewUri(null);
  };

  const produceCroppedUri = async (): Promise<string | null> => {
    if (!fitted || !imgNaturalSize || points.length < 2) {
      Alert.alert('영역 선택', '계좌번호 영역을 손가락으로 칠해주세요.');
      return null;
    }
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

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.max(0, Math.min(...xs) - BRUSH_SIZE / 2 - PADDING);
      const minY = Math.max(0, Math.min(...ys) - BRUSH_SIZE / 2 - PADDING);
      const maxX = Math.min(
        fitted.w,
        Math.max(...xs) + BRUSH_SIZE / 2 + PADDING,
      );
      const maxY = Math.min(
        fitted.h,
        Math.max(...ys) + BRUSH_SIZE / 2 + PADDING,
      );

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

  const handleShowPreview = async () => {
    setLoading(true);
    try {
      const uri = await produceCroppedUri();
      if (uri) setPreviewUri(uri);
    } catch (e: any) {
      Alert.alert('미리보기 에러', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const runOCR = async (uri: string) => {
    const response = await recognize(uri);
    const parsed = parseAccount(response);
    if (!parsed) {
      Alert.alert(
        'OCR 결과 없음',
        '계좌번호를 찾지 못했어요. 영역을 다시 칠해서 시도해주세요.',
      );
      return;
    }
    const ocrRawText = response.images[0]?.fields
      .map(f => f.inferText)
      .join(' ');
    const account = createAccount({
      accountNumber: parsed.accountNumber,
      bankName: parsed.bankName || '(은행 미확인)',
      bankCode: parsed.bankCode,
      holderName: parsed.holderName,
      sourceImageUri: uri,
      ocrRawText,
    });
    Clipboard.setString(parsed.accountNumber);
    Toast.show({
      type: 'success',
      text1: '계좌번호 복사됨',
      text2: formatAccountByBank(parsed.accountNumber, parsed.bankCode),
    });
    navigation.replace('Result', {
      accountId: account.id,
      candidates: parsed.candidates,
    });
  };

  const handleRecognizeDirect = async () => {
    setLoading(true);
    try {
      const uri = await produceCroppedUri();
      if (!uri) return;
      await runOCR(uri);
    } catch (e: any) {
      Alert.alert('OCR 에러', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRecognizeFromPreview = async () => {
    if (!previewUri) return;
    const uri = previewUri;
    setPreviewUri(null);
    setLoading(true);
    try {
      await runOCR(uri);
    } catch (e: any) {
      Alert.alert('OCR 에러', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.fill}>
      <View
        style={[styles.imageBox, { marginTop: insets.top }]}
        onLayout={onContainerLayout}
      >
        {fitted && (
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
            {...panResponder.panHandlers}
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
        )}

        {points.length === 0 && (
          <View pointerEvents="none" style={styles.guideHint}>
            <Text style={styles.guideText}>
              계좌번호 영역을 손가락으로 칠해주세요
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.eraseBtn}
          onPress={handleClear}
          disabled={points.length === 0}
        >
          <Eraser
            size={18}
            color={points.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.previewBtn, points.length < 2 && { opacity: 0.4 }]}
          onPress={handleShowPreview}
          disabled={points.length < 2 || loading}
        >
          {/* <Eye size={18} color="#fff" /> */}
          <Text style={styles.previewBtnText}>미리보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cropBtn, points.length < 2 && { opacity: 0.4 }]}
          onPress={handleRecognizeDirect}
          disabled={points.length < 2 || loading}
        >
          {/* <Scissors size={20} color="#fff" /> */}
          <Text style={styles.cropText}>계좌 읽기</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>미리보기</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPreviewUri(null)}
              >
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalImageBox}>
              {previewUri && (
                <Image
                  source={{ uri: previewUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  imageBox: { flex: 1, position: 'relative' },
  previewBox: { flex: 1, position: 'relative', backgroundColor: '#fff' },
  guideHint: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
  },
  guideText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#000',
  },
  backBtn: {
    position: 'absolute',
    top: 24,
    left: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backText: { color: '#fff', fontSize: 14 },
  eraseBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007aff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cropText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  previewBtn: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalImageBox: {
    height: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#fff', marginTop: 14, fontSize: 14 },
});
