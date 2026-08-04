import { parseAccount } from '../src/services/ocr/clovaParser';
import { formatAccountByBank } from '../src/services/ocr/bankPatterns';
import { ClovaResponse } from '../src/services/ocr/types';

const res = (texts: string[]): ClovaResponse => ({
  version: 'V2',
  requestId: 'test',
  timestamp: 0,
  images: [
    {
      inferResult: 'SUCCESS',
      message: 'SUCCESS',
      fields: texts.map(t => ({ inferText: t, inferConfidence: 0.95 })),
    },
  ],
});

describe('평생계좌(전화번호 형식) 문맥 판별', () => {
  it('계좌 힌트가 붙으면 평생계좌로 인식한다', () => {
    const r = parseAccount(res(['신한은행', '평생계좌', '010-1234-5678']));
    expect(r?.accountNumber).toBe('01012345678');
    expect(r?.bankName).toBe('신한은행');
  });

  it('은행명만 붙어 있어도 계좌로 인식한다', () => {
    const r = parseAccount(res(['국민', '010-1234-5678']));
    expect(r?.accountNumber).toBe('01012345678');
  });

  it('전화 힌트가 붙으면 계좌 후보에서 제외한다', () => {
    const r = parseAccount(res(['문의', '전화', '010-1234-5678']));
    expect(r).toBeNull();
  });

  it('전화번호와 일반 계좌가 같이 있으면 계좌를 우선한다', () => {
    const r = parseAccount(
      res(['연락처', '010-1234-5678', '입금', '국민은행', '123-456-789012']),
    );
    expect(r?.accountNumber).toBe('123456789012');
    expect(r?.candidates ?? []).toHaveLength(0);
  });

  it('평생계좌와 전화번호가 함께 있으면 각각 가까운 힌트를 따른다', () => {
    const r = parseAccount(
      res(['평생계좌', '010-1111-2222', '전화', '010-3333-4444']),
    );
    expect(r?.accountNumber).toBe('01011112222');
    expect(r?.candidates ?? []).toHaveLength(0);
  });

  it('문맥이 없으면 버리지 않고 신뢰도 낮은 후보로 남긴다', () => {
    const r = parseAccount(res(['010-1234-5678']));
    expect(r?.accountNumber).toBe('01012345678');
    expect(r!.confidence).toBeLessThan(0.5);
  });

  it('일반 계좌가 있으면 문맥 없는 전화번호 형식은 후순위 후보가 된다', () => {
    const r = parseAccount(res(['010-1234-5678', '351-1234-5678-90']));
    expect(r?.accountNumber).toBe('3511234567890');
    expect(r?.candidates?.[0].accountNumber).toBe('01012345678');
  });

  it('010으로 시작해도 12자리 이상이면 전화번호 검사를 하지 않는다', () => {
    const r = parseAccount(res(['전화', '0101234567890']));
    expect(r?.accountNumber).toBe('0101234567890');
  });

  it('같은 번호가 두 번 나와도 후보는 하나다', () => {
    const r = parseAccount(res(['국민은행', '123-456-789012', '123456789012']));
    expect(r?.accountNumber).toBe('123456789012');
    expect(r?.candidates ?? []).toHaveLength(0);
  });
});

describe('formatAccountByBank — 평생계좌 표기', () => {
  it('11자리는 3-4-4로 끊는다', () => {
    expect(formatAccountByBank('01012345678', '088')).toBe('010-1234-5678');
  });

  it('10자리는 3-3-4로 끊는다', () => {
    expect(formatAccountByBank('0111234567')).toBe('011-123-4567');
  });

  it('일반 계좌는 기존 은행 그룹 패턴을 유지한다', () => {
    expect(formatAccountByBank('3511234567890', '011')).toBe('351-1234-5678-90');
  });
});
