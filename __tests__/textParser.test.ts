import { parseAccountFromText } from '../src/services/ocr/textParser';

describe('parseAccountFromText', () => {
  it('은행명 + 하이픈 계좌번호 + 예금주를 추출한다', () => {
    const parsed = parseAccountFromText(
      '우리은행 1002-123-456789 예금주 홍길동 입니다',
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.accountNumber).toBe('1002123456789');
    expect(parsed!.bankName).toBe('우리은행');
    expect(parsed!.bankCode).toBe('020');
    expect(parsed!.holderName).toBe('홍길동');
    expect(parsed!.confidence).toBe(1);
  });

  it('은행명이 없으면 계좌번호 prefix로 은행을 추론한다', () => {
    const parsed = parseAccountFromText('3333-12-3412345 로 보내주세요');
    expect(parsed).not.toBeNull();
    expect(parsed!.bankName).toBe('카카오뱅크');
    expect(parsed!.bankCode).toBe('090');
  });

  it('은행을 못 찾으면 신뢰도를 낮춘다', () => {
    const parsed = parseAccountFromText('999912345678');
    expect(parsed).not.toBeNull();
    expect(parsed!.bankName).toBe('');
    expect(parsed!.confidence).toBeCloseTo(0.7);
  });

  it('전화번호는 계좌번호로 취급하지 않는다', () => {
    expect(parseAccountFromText('연락처 010-1234-5678')).toBeNull();
    expect(parseAccountFromText('011-9876-5432')).toBeNull();
  });

  it('숫자가 없거나 자릿수가 맞지 않으면 null', () => {
    expect(parseAccountFromText('계좌 보내드릴게요')).toBeNull();
    expect(parseAccountFromText('12345678')).toBeNull(); // 10자리 미만
    expect(parseAccountFromText('12345678901234567')).toBeNull(); // 16자리 초과
  });

  it('번호가 여러 개면 후보 목록을 만든다', () => {
    const parsed = parseAccountFromText(
      '국민 110123456789012 또는 신한 110987654321',
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.accountNumber).toBe('110123456789012');
    expect(parsed!.candidates).toHaveLength(1);
    expect(parsed!.candidates![0].accountNumber).toBe('110987654321');
  });

  it('OCR 신뢰도(baseConfidence)를 반영한다', () => {
    const parsed = parseAccountFromText('우리은행 1002-123-456789', 0.9);
    expect(parsed!.confidence).toBeCloseTo(0.9);
  });
});
