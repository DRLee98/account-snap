import { ClovaResponse, ParsedAccount } from './types';

const BANKS: Array<{ code: string; names: string[] }> = [
  { code: '004', names: ['국민은행', '국민', 'KB', 'kookmin'] },
  { code: '088', names: ['신한은행', '신한', 'shinhan'] },
  { code: '020', names: ['우리은행', '우리', 'woori'] },
  { code: '081', names: ['하나은행', '하나', 'KEB', 'hana'] },
  { code: '011', names: ['농협은행', 'NH', '농협'] },
  { code: '003', names: ['IBK기업은행', '기업은행', '기업'] },
  { code: '090', names: ['카카오뱅크', '카뱅', 'kakao'] },
  { code: '092', names: ['토스뱅크', '토스'] },
  { code: '089', names: ['케이뱅크', 'K뱅크', 'kbank'] },
  { code: '023', names: ['SC제일은행', '제일은행', 'SC'] },
  { code: '027', names: ['씨티은행', '씨티'] },
  { code: '071', names: ['우체국', '우체국예금'] },
  { code: '045', names: ['새마을금고', '새마을'] },
  { code: '048', names: ['신협'] },
];

const PHONE_PREFIXES = ['010', '011', '016', '017', '018', '019'];

export function parseAccount(response: ClovaResponse): ParsedAccount | null {
  const fields = response.images[0]?.fields ?? [];
  const joined = fields.map(f => f.inferText).join(' ');

  // 계좌번호 후보
  const numRegex = /\d[\d\-\s]{8,}\d/g;
  const rawMatches = joined.match(numRegex) ?? [];
  const numbers = rawMatches
    .map(m => m.replace(/[^\d]/g, ''))
    .filter(n => n.length >= 10 && n.length <= 16)
    .filter(n => !PHONE_PREFIXES.some(p => n.startsWith(p)));

  if (numbers.length === 0) return null;

  // 은행
  let bank: { code: string; name: string } | undefined;
  outer: for (const b of BANKS) {
    for (const alias of b.names) {
      if (joined.includes(alias)) {
        bank = { code: b.code, name: b.names[0] };
        break outer;
      }
    }
  }

  // 예금주 (옵션)
  let holderName: string | undefined;
  const holderIdx = joined.indexOf('예금주');
  if (holderIdx >= 0) {
    const after = joined.slice(holderIdx + 3);
    const m = after.match(/[가-힣]{2,5}/);
    if (m) holderName = m[0];
  }

  // 신뢰도
  const avgConf =
    fields.length > 0
      ? fields.reduce((s, f) => s + (f.inferConfidence || 0), 0) / fields.length
      : 0.5;
  const confidence = Math.min(1, avgConf * (bank ? 1 : 0.7));

  const primary: ParsedAccount = {
    accountNumber: numbers[0],
    bankName: bank?.name ?? '',
    bankCode: bank?.code,
    holderName,
    confidence,
  };

  if (numbers.length > 1) {
    primary.candidates = numbers.slice(1, 4).map(num => ({
      accountNumber: num,
      bankName: bank?.name ?? '',
      bankCode: bank?.code,
      confidence: confidence * 0.8,
    }));
  }

  return primary;
}
