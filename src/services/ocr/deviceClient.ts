import TextRecognition, {
  RecognizedText,
} from '../../specs/NativeTextRecognition';
import { joinReadingOrder } from './readingOrder';

export const isDeviceOcrAvailable = (): boolean => TextRecognition != null;

export type DeviceOcrResult = { text: string; confidence: number };

/**
 * 온디바이스 텍스트 인식 (iOS Vision / Android ML Kit).
 * 엔진이 주는 블록 순서는 읽기 순서를 보장하지 않으므로 좌표로 재정렬한다.
 * 모듈 미탑재·인식 실패·빈 결과는 모두 null — 호출부가 CLOVA로 폴백한다.
 */
export async function recognizeOnDevice(
  imageUri: string,
): Promise<DeviceOcrResult | null> {
  if (!TextRecognition) return null;
  try {
    const result: RecognizedText = await TextRecognition.recognize(imageUri);
    const text =
      result.blocks && result.blocks.length > 0
        ? joinReadingOrder(result.blocks)
        : result.text;
    if (!text.trim()) return null;
    return { text, confidence: result.confidence };
  } catch {
    return null;
  }
}
