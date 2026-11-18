import {
  formatAccountByBank,
  matchesBankFormat,
} from '../src/services/ocr/bankPatterns';
import { parseAccountFromText } from '../src/services/ocr/textParser';

jest.mock('react-native-config', () => ({ OCR_FORCE_CLOVA: undefined }));
jest.mock('../src/services/ocr/deviceClient', () => ({
  recognizeOnDevice: jest.fn(),
}));
jest.mock('../src/services/ocr/clovaClient', () => ({ recognize: jest.fn() }));

describe('matchesBankFormat', () => {
  it('은행 형식과 맞는 번호는 통과', () => {
    expect(matchesBankFormat('3521805984303', '011', '352-1805-9843-03')).toBe(
      true,
    );
    expect(
      matchesBankFormat('97101844901012', '003', '971-018449-01-012'),
    ).toBe(true);
  });

  it('하이픈 그룹이 다르면 불일치 (실제 오인식 352-18015-94-13)', () => {
    expect(matchesBankFormat('352180159413', '011', '352-18015-94-13')).toBe(
      false,
    );
  });

  it('자릿수가 은행 형식에 없으면 불일치', () => {
    expect(matchesBankFormat('35218059843', '011')).toBe(false);
  });

  it('공백으로만 쪼개진 번호는 자릿수만 검사', () => {
    expect(matchesBankFormat('3528311014193', '011', '352 8311 0141 93')).toBe(
      true,
    );
  });

  it('은행을 모르거나 평생계좌 형태면 판단하지 않는다', () => {
    expect(matchesBankFormat('12345678901', undefined, '123-45-678901')).toBe(
      true,
    );
    expect(matchesBankFormat('01012345678', '088', '010-1234-5678')).toBe(true);
  });

  it('실사용 데이터에 있던 형식은 정상으로 본다', () => {
    // 국민 6-2-6, 지역농협 6-2-6
    expect(
      matchesBankFormat('07270204070794', '004', '072702-04-070794'),
    ).toBe(true);
    expect(
      matchesBankFormat('10007952005002', '011', '100079-52-005002'),
    ).toBe(true);
  });
});

describe('parseAccountFromText — formatMismatch 표시', () => {
  it('오인식된 번호에 formatMismatch가 붙는다', () => {
    const p = parseAccountFromText(
      '계좌이처 농협 소떡소떡 000 떡꼬치2 352-18015-94-13 반선과',
      1,
    );
    expect(p?.formatMismatch).toBe(true);
  });

  it('정상 번호는 formatMismatch가 아니다', () => {
    const p = parseAccountFromText('계좌이체 농협 352-1805-9843-03 박성관');
    expect(p?.formatMismatch).toBe(false);
  });
});

describe('recognizeAccount — 형식 불일치 시 CLOVA 폴백', () => {
  const { recognizeAccount } = require('../src/services/ocr/recognizeAccount');
  const { recognizeOnDevice } = require('../src/services/ocr/deviceClient');
  const { recognize } = require('../src/services/ocr/clovaClient');

  const clovaWith = (text: string) => ({
    version: 'V2',
    requestId: 't',
    timestamp: 0,
    images: [
      {
        inferResult: 'SUCCESS',
        message: 'SUCCESS',
        fields: [{ inferText: text, inferConfidence: 0.99 }],
      },
    ],
  });

  beforeEach(() => jest.clearAllMocks());

  it('기기 내 결과가 고신뢰여도 형식이 틀리면 CLOVA를 호출한다', async () => {
    recognizeOnDevice.mockResolvedValue({
      text: '농협 352-18015-94-13',
      confidence: 1,
    });
    recognize.mockResolvedValue(clovaWith('농협 352-1805-9843-03'));

    const r = await recognizeAccount('file:///x.jpg');
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(r.source).toBe('clova');
    expect(r.parsed.accountNumber).toBe('3521805984303');
  });

  it('형식이 맞으면 CLOVA를 호출하지 않는다', async () => {
    recognizeOnDevice.mockResolvedValue({
      text: '농협 352-1805-9843-03',
      confidence: 1,
    });
    const r = await recognizeAccount('file:///x.jpg');
    expect(recognize).not.toHaveBeenCalled();
    expect(r.source).toBe('device');
  });

  it('CLOVA가 실패하면 형식 불일치 결과라도 돌려준다', async () => {
    recognizeOnDevice.mockResolvedValue({
      text: '농협 352-18015-94-13',
      confidence: 1,
    });
    recognize.mockRejectedValue(new Error('network'));
    const r = await recognizeAccount('file:///x.jpg');
    expect(r.source).toBe('device');
    expect(r.parsed.formatMismatch).toBe(true);
  });
});

describe('formatAccountByBank — 추가된 그룹', () => {
  it('국민 14자리는 6-2-6으로 끊는다', () => {
    expect(formatAccountByBank('07270204070794', '004')).toBe(
      '072702-04-070794',
    );
  });
});

describe('formatMismatch — 앞자리로 추측한 은행', () => {
  it('은행명이 텍스트에 없으면 형식 검증을 하지 않는다', () => {
    // "농 협"은 띄어쓰기로 은행명 매칭 실패 → 앞자리 100으로 신한 추측
    const p = parseAccountFromText('농 협 100079-52-005002 (예금주 : 남기영)');
    expect(p?.formatMismatch).toBe(false);
  });
});
