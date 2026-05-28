import { useEffect, useRef } from 'react';
import {
  Button,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import ImagePicker from 'react-native-image-crop-picker';
import { createAccount } from '../services/storage';
import { RootStackParamList } from '../navigation/types';

const MOCK_BANKS = [
  { name: '국민은행', code: '004' },
  { name: '신한은행', code: '088' },
  { name: '우리은행', code: '020' },
  { name: '카카오뱅크', code: '090' },
];

const mockOcrAndCreate = (sourceImageUri: string) => {
  // TODO(OCR-001/002): CLOVA OCR 호출 + 파싱으로 교체
  const bank = MOCK_BANKS[Math.floor(Math.random() * MOCK_BANKS.length)];
  const acctNum = String(Math.floor(Math.random() * 9e13) + 1e13);
  return createAccount({
    accountNumber: acctNum,
    bankName: bank.name,
    bankCode: bank.code,
    sourceImageUri,
  });
};

export default function CameraScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const cropAndGoToResult = async (sourceUri: string) => {
    try {
      const cropped = await ImagePicker.openCropper({
        path: sourceUri,
        mediaType: 'photo',
        width: 1200,
        height: 800,
        freeStyleCropEnabled: true,
        cropperToolbarTitle: '계좌 영역 자르기',
      });
      const account = mockOcrAndCreate(cropped.path);
      navigation.replace('Result', { accountId: account.id });
    } catch {
      // cancelled
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePhoto({ flash: 'off' });
    const path = photo.path.startsWith('file://')
      ? photo.path
      : `file://${photo.path}`;
    await cropAndGoToResult(path);
  };

  const handleGallery = async () => {
    try {
      const image = await ImagePicker.openPicker({ mediaType: 'photo' });
      await cropAndGoToResult(image.path);
    } catch {
      // cancelled
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>카메라 권한이 필요해요</Text>
        <Text style={styles.hint}>
          계좌 사진을 찍기 위해 카메라 권한을 허용해주세요.
        </Text>
        <View style={styles.spacer} />
        <Button title="권한 요청" onPress={requestPermission} />
        <View style={styles.gap} />
        <Button title="설정 열기" onPress={() => Linking.openSettings()} />
        <View style={styles.gap} />
        <Button title="갤러리에서 선택" onPress={handleGallery} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>카메라를 사용할 수 없어요</Text>
        <Text style={styles.hint}>
          시뮬레이터에서는 카메라 디바이스가 없어요. 갤러리에서 선택해주세요.
        </Text>
        <View style={styles.spacer} />
        <Button title="갤러리에서 선택" onPress={handleGallery} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
      />
      <View style={styles.guide}>
        <Text style={styles.guideText}>계좌가 잘 보이게 촬영해주세요</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleGallery} style={styles.sideBtn}>
          <Text style={styles.sideBtnText}>갤러리</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCapture} style={styles.shutter}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        <View style={styles.sideBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, color: '#666', textAlign: 'center' },
  spacer: { height: 20 },
  gap: { height: 10 },
  guide: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  guideText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sideBtn: { width: 80, alignItems: 'center' },
  sideBtnText: { color: '#fff', fontSize: 14 },
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
