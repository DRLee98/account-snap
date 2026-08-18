import { ParsedAccount } from './types';
import {
  findBankByText,
  inferBankByAccountNumber,
  BankPattern,
} from './bankPatterns';

const PHONE_PREFIXES = ['010', '011', '016', '017', '018', '019'];

/**
 * 자유 텍스트에서 계좌번호/은행명/예금주를 추출.
 *
 * OCR 결과(CLOVA/온디바이스)와 클립보드 텍스트가 모두 이 파서를 공유한다.
 * `baseConfidence`: 입력 텍스트 자체의 신뢰도 — OCR이면 인식 신뢰도,
 * 클립보드처럼 원문 그대로면 1.
 */
export function parseAccountFromText(
  text: string,
  baseConfidence = 1,
): ParsedAccount | null {
  // 계좌번호 후보
  const numRegex = /\d[\d\-\s]{8,}\d/g;
  const rawMatches = text.match(numRegex) ?? [];
  const numbers = rawMatches
    .map(m => m.replace(/[^\d]/g, ''))
    .filter(n => n.length >= 10 && n.length <= 16)
    .filter(n => !PHONE_PREFIXES.some(p => n.startsWith(p)));

  if (numbers.length === 0) return null;

  // 텍스트 기반 은행 매칭 (우선)
  const bankFromText = findBankByText(text);

  // 예금주 (옵션)
  let holderName: string | undefined;
  const holderIdx = text.indexOf('예금주');
  if (holderIdx >= 0) {
    const after = text.slice(holderIdx + 3);
    const m = after.match(/[가-힣]{2,5}/);
    if (m) holderName = m[0];
  }

  const toParsed = (num: string): ParsedAccount => {
    // 텍스트에 은행명 없으면 계좌번호 prefix로 추론
    const bank: BankPattern | undefined =
      bankFromText ?? inferBankByAccountNumber(num);
    return {
      accountNumber: num,
      bankName: bank?.name ?? '',
      bankCode: bank?.code,
      holderName,
      confidence: Math.min(1, baseConfidence * (bank ? 1 : 0.7)),
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
