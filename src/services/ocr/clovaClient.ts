import Config from 'react-native-config';
import { ClovaResponse } from './types';

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const inferExtension = (uri: string): string => {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.jpeg')) return 'jpeg';
  return 'jpg';
};

// OCR_PROXY_URL이 설정되면 자체 proxy를 통해 호출 (CLOVA 키 노출 X)
// 미설정 시 NCP CLOVA OCR을 직접 호출 (개발/초기 출시용)
export async function recognize(imageUri: string): Promise<ClovaResponse> {
  const proxyUrl = Config.OCR_PROXY_URL;
  const proxyToken = Config.OCR_PROXY_TOKEN;
  const invokeUrl = Config.CLOVA_INVOKE_URL;
  const secretKey = Config.CLOVA_SECRET_KEY;

  const useProxy = !!proxyUrl;
  const endpoint = useProxy ? proxyUrl : invokeUrl;
  if (!endpoint) {
    throw new Error('OCR endpoint가 설정되지 않았습니다 (.env 확인)');
  }
  if (!useProxy && !secretKey) {
    throw new Error('CLOVA_SECRET_KEY가 설정되지 않았습니다 (.env 확인)');
  }

  const form = new FormData();
  form.append(
    'message',
    JSON.stringify({
      version: 'V2',
      requestId: uuid(),
      timestamp: Date.now(),
      images: [
        {
          format: inferExtension(imageUri),
          name: 'account',
        },
      ],
    }),
  );
  form.append('file', {
    uri: imageUri,
    name: `account.${inferExtension(imageUri)}`,
    type: `image/${inferExtension(imageUri)}`,
  } as any);

  const headers: Record<string, string> = useProxy
    ? proxyToken
      ? { 'X-Proxy-Token': proxyToken }
      : {}
    : { 'X-OCR-SECRET': secretKey! };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OCR ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as ClovaResponse;
}
