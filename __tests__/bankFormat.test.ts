import {
  formatAccountByBank,
  matchesBankFormat,
} from '../src/services/ocr/bankPatterns';
import { parseAccountFromText } from '../src/services/ocr/textParser';


describe('matchesBankFormat', () => {
  it('은행 형식과 맞는 번호는 통과', () => {
    expect(matchesBankFormat('3012468135702', '011', '301-2468-1357-02')).toBe(
      true,
    );
    expect(
      matchesBankFormat('97101844901012', '003', '971-018449-01-012'),
    ).toBe(true);
  });

  it('하이픈 그룹이 다르면 불일치 (실제 오인식 301-24618-35-12)', () => {
    expect(matchesBankFormat('301246183512', '011', '301-24618-35-12')).toBe(
      false,
    );
  });

  it('자릿수가 은행 형식에 없으면 불일치', () => {
    expect(matchesBankFormat('30124681357', '011')).toBe(false);
  });

  it('공백으로만 쪼개진 번호는 자릿수만 검사', () => {
    expect(matchesBankFormat('1234567890123', '011', '123 4567 8901 23')).toBe(
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
      '계좌이처 농협 소떡소떡 000 떡꼬치2 301-24618-35-12 긴민스',
      1,
    );
    expect(p?.formatMismatch).toBe(true);
  });

  it('정상 번호는 formatMismatch가 아니다', () => {
    const p = parseAccountFromText('계좌이체 농협 301-2468-1357-02 김민수');
    expect(p?.formatMismatch).toBe(false);
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
