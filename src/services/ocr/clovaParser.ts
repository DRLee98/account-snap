import { ClovaResponse, ParsedAccount } from './types';
import {
  findBankByText,
  inferBankByAccountNumber,
  BankPattern,
} from './bankPatterns';

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

  // 텍스트 기반 은행 매칭 (우선)
  const bankFromText = findBankByText(joined);

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

  const toParsed = (num: string): ParsedAccount => {
    // 텍스트에 은행명 없으면 계좌번호 prefix로 추론
    const bank: BankPattern | undefined =
      bankFromText ?? inferBankByAccountNumber(num);
    return {
      accountNumber: num,
      bankName: bank?.name ?? '',
      bankCode: bank?.code,
      holderName,
      confidence: Math.min(1, avgConf * (bank ? 1 : 0.7)),
    };
  };

  const primary = toParsed(numbers[0]);

  if (numbers.length > 1) {
    primary.candidates = numbers.slice(1, 4).map(num => {
      const p = toParsed(num);
      p.confidence = (p.confidence ?? 0) * 0.8;
      return p;
    });
  }

  return primary;
}
