import { ClovaResponse, ParsedAccount } from './types';
import {
  findBankByText,
  inferBankByAccountNumber,
  isPhoneFormatNumber,
  BANK_ALIASES_LOWER,
  BankPattern,
} from './bankPatterns';

/** 숫자 앞뒤로 문맥을 살펴볼 글자 수 */
const CONTEXT_WINDOW = 24;

/** 근처에 있으면 전화번호로 판단 */
const PHONE_HINTS = [
  '전화',
  '연락처',
  '연락',
  '휴대폰',
  '휴대전화',
  '핸드폰',
  '폰번호',
  '문의',
  '상담',
  '예약',
  '주문',
  '팩스',
  'tel',
  't.',
  'h.p',
  'phone',
  'fax',
  'mobile',
];

/** 근처에 있으면 평생계좌로 판단 */
const ACCOUNT_HINTS = [
  '평생계좌',
  '평생',
  '계좌',
  '입금',
  '송금',
  '이체',
  '통장',
  '예금주',
];

/**
 * 숫자 후보의 성격.
 * - `account`: 전화번호 형태가 아닌 일반 계좌번호
 * - `lifetime`: 전화번호 형태이지만 문맥상 평생계좌
 * - `ambiguous`: 전화번호 형태인데 판단할 문맥이 없음 (후순위 후보)
 */
type NumberKind = 'account' | 'lifetime' | 'ambiguous';

const KIND_RANK: Record<NumberKind, number> = {
  account: 0,
  lifetime: 1,
  ambiguous: 2,
};

const KIND_CONFIDENCE: Record<NumberKind, number> = {
  account: 1,
  lifetime: 1,
  ambiguous: 0.5,
};

/**
 * 뒤쪽 힌트에 더하는 거리 페널티.
 * "연락처 010-... 입금 국민은행 ..."처럼 번호 뒤 단어는 다음 항목의 라벨인 경우가 많아
 * 앞쪽 힌트가 있으면 항상 앞쪽이 이기게 한다.
 */
const AFTER_PENALTY = CONTEXT_WINDOW;

/** before/after 문맥에서 힌트 단어까지의 최단 거리 (없으면 Infinity) */
function nearestHintDistance(
  before: string,
  after: string,
  hints: string[],
): number {
  let best = Infinity;
  for (const hint of hints) {
    const b = before.lastIndexOf(hint);
    if (b >= 0) best = Math.min(best, before.length - (b + hint.length));
    const a = after.indexOf(hint);
    if (a >= 0) best = Math.min(best, a + AFTER_PENALTY);
  }
  return best;
}

/**
 * 전화번호 형태 숫자를 앞뒤 문맥으로 판별.
 * 계좌 힌트와 전화 힌트가 모두 있으면 더 가까운 쪽을 따른다.
 */
function classifyPhoneFormat(
  lowerJoined: string,
  start: number,
  end: number,
): 'phone' | 'lifetime' | 'ambiguous' {
  const before = lowerJoined.slice(Math.max(0, start - CONTEXT_WINDOW), start);
  const after = lowerJoined.slice(end, end + CONTEXT_WINDOW);

  const phoneDist = nearestHintDistance(before, after, PHONE_HINTS);
  const accountDist = Math.min(
    nearestHintDistance(before, after, ACCOUNT_HINTS),
    nearestHintDistance(before, after, BANK_ALIASES_LOWER),
  );

  if (accountDist < phoneDist) return 'lifetime';
  if (phoneDist < accountDist) return 'phone';
  // 주변에 아무 힌트도 없을 때만 — 이미지 어딘가에 '평생계좌'가 있으면 계좌로
  if (phoneDist === Infinity && lowerJoined.includes('평생계좌')) {
    return 'lifetime';
  }
  return 'ambiguous';
}

type NumberMatch = { digits: string; start: number; end: number };

const MIN_DIGITS = 10;
const MAX_DIGITS = 16;

/**
 * 번호 두 개가 나란히 있어 하나로 잡힌 경우 분리.
 * 공백으로 끊은 조각이 모두 그 자체로 완전한 번호일 때만 분리한다 —
 * 한 번호가 여러 필드로 쪼개진 경우("010" "1234" "5678")를 잘못 합치지 않기 위함.
 */
function splitMergedMatch(text: string, offset: number): NumberMatch[] {
  const parts: NumberMatch[] = [];
  const tokenRegex = /\S+/g;
  for (let t = tokenRegex.exec(text); t; t = tokenRegex.exec(text)) {
    const digits = t[0].replace(/[^\d]/g, '');
    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return [];
    parts.push({
      digits,
      start: offset + t.index,
      end: offset + t.index + t[0].length,
    });
  }
  return parts.length > 1 ? parts : [];
}

export function parseAccount(response: ClovaResponse): ParsedAccount | null {
  const fields = response.images[0]?.fields ?? [];
  const joined = fields.map(f => f.inferText).join(' ');
  const lowerJoined = joined.toLowerCase();

  // 계좌번호 후보 — 전화번호 형태는 버리지 않고 문맥으로 분류
  const numRegex = /\d[\d\-\s]{8,}\d/g;
  const candidates: Array<{ digits: string; kind: NumberKind }> = [];
  const seen = new Set<string>();

  for (let m = numRegex.exec(joined); m; m = numRegex.exec(joined)) {
    const digits = m[0].replace(/[^\d]/g, '');
    let matches: NumberMatch[];
    if (digits.length > MAX_DIGITS) {
      matches = splitMergedMatch(m[0], m.index);
    } else if (digits.length >= MIN_DIGITS) {
      matches = [{ digits, start: m.index, end: m.index + m[0].length }];
    } else {
      continue;
    }

    for (const match of matches) {
      if (seen.has(match.digits)) continue;

      let kind: NumberKind = 'account';
      if (isPhoneFormatNumber(match.digits)) {
        const verdict = classifyPhoneFormat(
          lowerJoined,
          match.start,
          match.end,
        );
        if (verdict === 'phone') continue;
        kind = verdict === 'lifetime' ? 'lifetime' : 'ambiguous';
      }

      seen.add(match.digits);
      candidates.push({ digits: match.digits, kind });
    }
  }

  if (candidates.length === 0) return null;

  // 일반 계좌 > 평생계좌 > 판단 불가 순 (동순위는 등장 순서 유지)
  candidates.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);

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

  const toParsed = (c: { digits: string; kind: NumberKind }): ParsedAccount => {
    // 텍스트에 은행명 없으면 계좌번호 prefix로 추론
    const bank: BankPattern | undefined =
      bankFromText ?? inferBankByAccountNumber(c.digits);
    return {
      accountNumber: c.digits,
      bankName: bank?.name ?? '',
      bankCode: bank?.code,
      holderName,
      confidence: Math.min(
        1,
        avgConf * (bank ? 1 : 0.7) * KIND_CONFIDENCE[c.kind],
      ),
    };
  };

  const primary = toParsed(candidates[0]);

  if (candidates.length > 1) {
    primary.candidates = candidates.slice(1, 4).map(c => {
      const p = toParsed(c);
      p.confidence = (p.confidence ?? 0) * 0.8;
      return p;
    });
  }

  return primary;
}
