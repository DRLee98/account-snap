import Config from 'react-native-config';
import { recognize } from './clovaClient';
import { parseAccount } from './clovaParser';
import { recognizeOnDevice } from './deviceClient';
import { parseAccountFromText } from './textParser';
import { ParsedAccount } from './types';

export type RecognizeAccountResult = {
  parsed: ParsedAccount;
  rawText: string;
  source: 'device' | 'clova';
};

// 이 값 미만이면 온디바이스 결과를 버리고 CLOVA로 재시도
const DEVICE_MIN_CONFIDENCE = 0.4;

/**
 * 계좌 인식 전체 플로우:
 * 1차 온디바이스 OCR (무료·오프라인·이미지 외부 전송 없음)
 * → 미검출/저신뢰면 CLOVA 폴백.
 *
 * CLOVA 호출까지 실패했더라도 온디바이스에서 저신뢰 결과라도 있었다면
 * 그 결과를 반환한다 (사용자가 결과 화면에서 수정 가능).
 * 아무 계좌도 못 찾으면 null, 인식 자체가 불가능하면 throw.
 */
export async function recognizeAccount(
  imageUri: string,
): Promise<RecognizeAccountResult | null> {
  let deviceResult: RecognizeAccountResult | null = null;

  if (Config.OCR_FORCE_CLOVA !== 'true') {
    const device = await recognizeOnDevice(imageUri);
    if (device) {
      const parsed = parseAccountFromText(device.text, device.confidence);
      if (parsed) {
        deviceResult = { parsed, rawText: device.text, source: 'device' };
        if (parsed.confidence >= DEVICE_MIN_CONFIDENCE) {
          return deviceResult;
        }
      }
    }
  }

  try {
    const response = await recognize(imageUri);
    const parsed = parseAccount(response);
    if (!parsed) return deviceResult;
    const rawText =
      response.images[0]?.fields.map(f => f.inferText).join(' ') ?? '';
    return { parsed, rawText, source: 'clova' };
  } catch (e) {
    if (deviceResult) return deviceResult;
    throw e;
  }
}
