import { buildTossSendUrl, tossBankName } from '../src/services/toss';
import { BANK_PATTERNS } from '../src/services/ocr/bankPatterns';

describe('tossBankName', () => {
  it('토스가 에러를 내는 정식 은행명을 짧은 표기로 바꾼다', () => {
    expect(tossBankName({ bankName: '농협은행', bankCode: '011' })).toBe(
      '농협',
    );
    expect(tossBankName({ bankName: '국민은행', bankCode: '004' })).toBe(
      '국민',
    );
    expect(tossBankName({ bankName: 'IBK기업은행', bankCode: '003' })).toBe(
      '기업',
    );
    expect(tossBankName({ bankName: '케이뱅크', bankCode: '089' })).toBe(
      '케이뱅크',
    );
  });

  it('코드가 없으면 은행명으로 은행을 찾아 매핑한다', () => {
    expect(tossBankName({ bankName: '농협' })).toBe('농협');
    expect(tossBankName({ bankName: '국민은행' })).toBe('국민');
  });

  it('매핑에 없는 은행은 저장된 이름을 그대로 쓴다', () => {
    expect(tossBankName({ bankName: '씨티은행', bankCode: '027' })).toBe(
      '씨티은행',
    );
    expect(tossBankName({ bankName: '(은행 미확인)' })).toBe('(은행 미확인)');
  });

  it('앱이 아는 은행은 씨티를 빼고 모두 실기기 확인된 토스 표기가 된다', () => {
    // 2026-11-02 Android 실기기에서 토스가 은행을 채운 짧은 표기
    const verified = [
      '국민',
      '농협',
      '기업',
      '신한',
      '우리',
      '하나',
      '카카오뱅크',
      '토스뱅크',
      '케이뱅크',
      '새마을',
      '우체국',
      'SC제일',
      '부산',
      '대구',
      '수협',
      '신협',
    ];
    const notVerified = BANK_PATTERNS.filter(
      b =>
        !verified.includes(
          tossBankName({ bankName: b.name, bankCode: b.code }),
        ),
    ).map(b => b.name);
    expect(notVerified).toEqual(['씨티은행']);
  });
});

describe('buildTossSendUrl', () => {
  it('은행은 토스 표기로 인코딩하고 계좌번호는 숫자만 넣는다', () => {
    expect(
      buildTossSendUrl({
        bankName: '농협은행',
        bankCode: '011',
        accountNumber: '352-1805-9843-03',
      }),
    ).toBe(
      `supertoss://send?bank=${encodeURIComponent(
        '농협',
      )}&accountNo=3521805984303&amount=`,
    );
  });
});
