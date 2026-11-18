import { recognizeAccount } from '../src/services/ocr/recognizeAccount';
import { recognizeOnDevice } from '../src/services/ocr/deviceClient';
import { recognize } from '../src/services/ocr/clovaClient';

jest.mock('../src/services/ocr/deviceClient', () => ({
  recognizeOnDevice: jest.fn(),
}));
jest.mock('../src/services/ocr/clovaClient', () => ({ recognize: jest.fn() }));

const mockDevice = recognizeOnDevice as jest.Mock;
const mockClova = recognize as jest.Mock;

const clovaWith = (texts: string[]) => ({
  version: 'V2',
  requestId: 't',
  timestamp: 0,
  images: [
    {
      inferResult: 'SUCCESS',
      message: 'SUCCESS',
      fields: texts.map(t => ({ inferText: t, inferConfidence: 0.99 })),
    },
  ],
});

describe('recognizeAccount — CLOVA 우선', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CLOVA가 성공하면 기기 내 OCR을 호출하지 않는다', async () => {
    mockClova.mockResolvedValue(clovaWith(['농협', '352-1805-9843-03']));
    const r = await recognizeAccount('file:///x.jpg');
    expect(r?.source).toBe('clova');
    expect(r?.parsed.accountNumber).toBe('3521805984303');
    expect(r?.rawText).toBe('농협 352-1805-9843-03');
    expect(mockDevice).not.toHaveBeenCalled();
  });

  it('CLOVA가 계좌를 못 찾으면 기기 내 OCR로 넘기지 않고 null', async () => {
    mockClova.mockResolvedValue(clovaWith(['소떡소떡', '떡꼬치']));
    expect(await recognizeAccount('file:///x.jpg')).toBeNull();
    expect(mockDevice).not.toHaveBeenCalled();
  });

  it('CLOVA 호출이 실패하면(오프라인 등) 기기 내 OCR로 대신한다', async () => {
    mockClova.mockRejectedValue(new Error('Network request failed'));
    mockDevice.mockResolvedValue({
      text: '농협 352-1805-9843-03',
      confidence: 0.9,
    });
    const r = await recognizeAccount('file:///x.jpg');
    expect(r?.source).toBe('device');
    expect(r?.parsed.accountNumber).toBe('3521805984303');
  });

  it('CLOVA도 실패하고 기기 내 OCR도 못 읽으면 CLOVA 오류를 던진다', async () => {
    mockClova.mockRejectedValue(new Error('Network request failed'));
    mockDevice.mockResolvedValue(null);
    await expect(recognizeAccount('file:///x.jpg')).rejects.toThrow(
      'Network request failed',
    );
  });
});
