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

export async function recognize(imageUri: string): Promise<ClovaResponse> {
  const invokeUrl = Config.CLOVA_INVOKE_URL;
  const secretKey = Config.CLOVA_SECRET_KEY;

  if (!invokeUrl || !secretKey) {
    throw new Error('CLOVA OCR 키가 설정되지 않았습니다 (.env 확인)');
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

  const res = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      'X-OCR-SECRET': secretKey,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CLOVA OCR ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as ClovaResponse;
}
