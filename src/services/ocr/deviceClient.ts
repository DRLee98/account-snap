import TextRecognition, {
  RecognizedText,
} from '../../specs/NativeTextRecognition';

export const isDeviceOcrAvailable = (): boolean => TextRecognition != null;

/**
 * 온디바이스 텍스트 인식 (iOS Vision / Android ML Kit).
 * 모듈 미탑재·인식 실패·빈 결과는 모두 null — 호출부가 CLOVA로 폴백한다.
 */
export async function recognizeOnDevice(
  imageUri: string,
): Promise<RecognizedText | null> {
  if (!TextRecognition) return null;
  try {
    const result = await TextRecognition.recognize(imageUri);
    if (!result.text.trim()) return null;
    return result;
  } catch {
    return null;
  }
}
