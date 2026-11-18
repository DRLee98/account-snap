import { recognize } from './clovaClient';
import { joinClovaFields, parseAccount } from './clovaParser';
import { recognizeOnDevice } from './deviceClient';
import { parseAccountFromText } from './textParser';
import { ParsedAccount } from './types';

export type RecognizeAccountResult = {
  parsed: ParsedAccount;
  rawText: string;
  source: 'device' | 'clova';
};

/**
 * 계좌 인식 전체 플로우: CLOVA 우선.
 *
 * 기기 내 OCR은 좁은 글씨체 등에서 번호를 틀리게 읽고도 신뢰도가 높게 나와
 * 잘못된 계좌로 송금될 위험이 있어, 정확도가 검증된 CLOVA를 기본으로 쓴다.
 * 기기 내 OCR은 CLOVA 호출 자체가 실패했을 때(오프라인·네트워크 오류)만 쓴다.
 * CLOVA가 정상 응답했는데 계좌를 못 찾은 경우엔 기기 내 OCR로 넘기지 않는다.
 *
 * 아무 계좌도 못 찾으면 null, 둘 다 인식 불가면 CLOVA 오류를 throw.
 */
export async function recognizeAccount(
  imageUri: string,
): Promise<RecognizeAccountResult | null> {
  try {
    const response = await recognize(imageUri);
    const parsed = parseAccount(response);
    if (!parsed) return null;
    const rawText = joinClovaFields(response.images[0]?.fields ?? []);
    return { parsed, rawText, source: 'clova' };
  } catch (e) {
    const device = await recognizeOnDevice(imageUri);
    const parsed = device
      ? parseAccountFromText(device.text, device.confidence)
      : null;
    if (device && parsed) {
      return { parsed, rawText: device.text, source: 'device' };
    }
    throw e;
  }
}
