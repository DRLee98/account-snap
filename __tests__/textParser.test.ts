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

  it('전화 힌트가 붙은 전화번호는 제외하고, 문맥 없는 전화번호 형식은 저신뢰 후보로 남긴다', () => {
    expect(parseAccountFromText('연락처 010-1234-5678')).toBeNull();
    const ambiguous = parseAccountFromText('011-9876-5432');
    expect(ambiguous?.accountNumber).toBe('01198765432');
    expect(ambiguous!.confidence).toBeLessThan(0.5);
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

  it('다른 단어에 붙은 숫자는 계좌번호에 합치지 않는다', () => {
    // 실제 오인식 사례: "떡꼬치2"의 2가 계좌번호 앞에 붙었음
    const parsed = parseAccountFromText(
      '계좌이체 농협 소떡소떡 000 떡꼬치2 301-2468-1357-02 김민수',
    );
    expect(parsed!.accountNumber).toBe('3012468135702');

    const trailing = parseAccountFromText('농협 301-2468-1357-02 2인분');
    expect(trailing!.accountNumber).toBe('3012468135702');
  });

  it('은행명과 붙어 있는 단일 토큰 번호는 그대로 인식한다', () => {
    const parsed = parseAccountFromText('농협301-2468-1357-02');
    expect(parsed!.accountNumber).toBe('3012468135702');
  });

  it('공백으로 쪼개진 번호는 여전히 합친다', () => {
    const parsed = parseAccountFromText('농협 / 홍길동 123 4567 8901 23');
    expect(parsed!.accountNumber).toBe('1234567890123');
  });

  it('OCR 신뢰도(baseConfidence)를 반영한다', () => {
    const parsed = parseAccountFromText('우리은행 1002-123-456789', 0.9);
    expect(parsed!.confidence).toBeCloseTo(0.9);
  });
});
