import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import ImagePicker from 'react-native-image-crop-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { Image as ImageIcon, List as ListIcon } from 'lucide-react-native';
import { createAccount } from '../services/storage';
import { recognize, parseAccount } from '../services/ocr';
import { formatAccountNumber } from '../models/account';
import { RootStackParamList } from '../navigation/types';

export default function CameraScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const goToCrop = (sourceUri: string) => {
    navigation.navigate('Crop', { sourceUri });
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePhoto({ flash: 'off' });
    const path = photo.path.startsWith('file://')
      ? photo.path
      : `file://${photo.path}`;
    await goToCrop(path);
  };

  const handleGallery = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (response.didCancel) return;
    const uri = response.assets?.[0]?.uri;
    if (!uri) return;
    await goToCrop(uri);
  };

  const openList = () => navigation.navigate('AccountList');

  if (loading) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>계좌 정보를 읽고 있어요...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.fill, styles.center, { padding: 24 }]}>
        <Text style={styles.permTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.permHint}>
          계좌 사진을 찍기 위해 카메라 권한을 허용해주세요.
        </Text>
        <View style={{ height: 16 }} />
        <Button title="권한 요청" onPress={requestPermission} />
        <View style={{ height: 10 }} />
        <Button title="설정 열기" onPress={() => Linking.openSettings()} />
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.sideBtn} onPress={openList}>
            <ListIcon size={26} color="#fff" strokeWidth={2} />
            <Text style={styles.sideBtnLabel}>목록</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn} onPress={handleGallery}>
            <ImageIcon size={26} color="#fff" strokeWidth={2} />
            <Text style={styles.sideBtnLabel}>갤러리</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noDevice]}>
          <Text style={styles.permTitle}>시뮬레이터엔 카메라가 없어요</Text>
          <Text style={styles.permHint}>갤러리에서 선택해주세요</Text>
        </View>
      )}

      <View
        style={[styles.guide, { top: insets.top + 16, left: 24, right: 24 }]}
      >
        <Text style={styles.guideText}>계좌가 잘 보이게 촬영해주세요</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.sideBtn} onPress={openList}>
          <ListIcon size={26} color="#fff" strokeWidth={2} />
          <Text style={styles.sideBtnLabel}>목록</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, !device && { opacity: 0.4 }]}
          onPress={handleCapture}
          disabled={!device}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={handleGallery}>
          <ImageIcon size={26} color="#fff" strokeWidth={2} />
          <Text style={styles.sideBtnLabel}>갤러리</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  noDevice: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  loadingText: { color: '#fff', marginTop: 14, fontSize: 14 },
  permTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  permHint: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  guide: {
    position: 'absolute',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
  },
  guideText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnLabel: { color: '#fff', fontSize: 10, marginTop: 2 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
