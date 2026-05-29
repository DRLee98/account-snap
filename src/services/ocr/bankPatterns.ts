/**
 * 한국 은행별 계좌번호 패턴.
 *
 * - `aliases`: OCR 텍스트에서 은행명 매칭 키워드
 * - `prefixes`: 계좌번호 앞자리로 은행 추론 (강한 신호만, 충돌 가능한 prefix는 제외)
 * - `groups`: 표시 시 그룹화 자릿수 합이 lengths 중 하나와 일치해야 함
 * - `lengths`: 일반적 자릿수 (검증/그룹화 선택용)
 *
 * 정확도는 100%가 아님 — 사용자가 결과 화면에서 수정 가능.
 */
export type BankPattern = {
  code: string;
  name: string;
  aliases: string[];
  prefixes?: string[];
  lengths?: number[];
  groups: number[][];
};

export const BANK_PATTERNS: BankPattern[] = [
  {
    code: '004',
    name: '국민은행',
    aliases: ['국민은행', '국민', 'KB', 'kookmin'],
    prefixes: ['004', '009'],
    lengths: [12, 14],
    groups: [[3, 2, 4, 3], [3, 4, 7]],
  },
  {
    code: '088',
    name: '신한은행',
    aliases: ['신한은행', '신한', 'shinhan'],
    prefixes: ['110', '140', '100', '111'],
    lengths: [11, 12],
    groups: [[3, 3, 6], [3, 2, 6]],
  },
  {
    code: '020',
    name: '우리은행',
    aliases: ['우리은행', '우리', 'woori'],
    prefixes: ['1002', '1005', '1006'],
    lengths: [13],
    groups: [[4, 3, 6]],
  },
  {
    code: '081',
    name: '하나은행',
    aliases: ['하나은행', '하나', 'KEB', 'hana'],
    prefixes: ['254', '331', '345', '388'],
    lengths: [14],
    groups: [[3, 6, 5]],
  },
  {
    code: '011',
    name: '농협은행',
    aliases: ['농협은행', 'NH', '농협'],
    prefixes: ['351', '302', '317', '356'],
    lengths: [13],
    groups: [[3, 4, 4, 2]],
  },
  {
    code: '003',
    name: 'IBK기업은행',
    aliases: ['IBK기업은행', '기업은행', '기업', 'IBK'],
    prefixes: ['001', '101', '511', '566'],
    lengths: [14],
    groups: [[3, 6, 2, 3]],
  },
  {
    code: '090',
    name: '카카오뱅크',
    aliases: ['카카오뱅크', '카뱅', 'kakao'],
    prefixes: ['3333', '7979'],
    lengths: [13, 14],
    groups: [[4, 2, 7]],
  },
  {
    code: '092',
    name: '토스뱅크',
    aliases: ['토스뱅크', '토스'],
    prefixes: ['100'],
    lengths: [12],
    groups: [[4, 4, 4]],
  },
  {
    code: '089',
    name: '케이뱅크',
    aliases: ['케이뱅크', 'K뱅크', 'kbank'],
    lengths: [12, 13],
    groups: [[3, 3, 6]],
  },
  {
    code: '023',
    name: 'SC제일은행',
    aliases: ['SC제일은행', '제일은행', 'SC'],
    lengths: [11, 12],
    groups: [[3, 2, 6]],
  },
  {
    code: '027',
    name: '씨티은행',
    aliases: ['씨티은행', '씨티', 'Citi'],
    lengths: [11, 12],
    groups: [[3, 3, 6]],
  },
  {
    code: '071',
    name: '우체국',
    aliases: ['우체국', '우체국예금'],
    prefixes: ['600'],
    lengths: [13],
    groups: [[6, 2, 6]],
  },
  {
    code: '045',
    name: '새마을금고',
    aliases: ['새마을금고', '새마을'],
    lengths: [13],
    groups: [[4, 4, 5]],
  },
  {
    code: '048',
    name: '신협',
    aliases: ['신협'],
    prefixes: ['131'],
    lengths: [13],
    groups: [[4, 4, 5]],
  },
];

const ALIAS_TO_BANK = new Map<string, BankPattern>();
BANK_PATTERNS.forEach(b => b.aliases.forEach(a => ALIAS_TO_BANK.set(a, b)));

/** 텍스트에 등장한 은행 별칭으로 매칭 */
export function findBankByText(text: string): BankPattern | undefined {
  for (const [alias, bank] of ALIAS_TO_BANK) {
    if (text.includes(alias)) return bank;
  }
  return undefined;
}

/**
 * 계좌번호 prefix로 은행 추론.
 * 가장 긴 prefix 매치 우선 (3333 > 100).
 */
export function inferBankByAccountNumber(
  accountNumber: string,
): BankPattern | undefined {
  let best: { bank: BankPattern; prefix: string } | undefined;
  for (const bank of BANK_PATTERNS) {
    if (!bank.prefixes) continue;
    for (const p of bank.prefixes) {
      if (accountNumber.startsWith(p)) {
        if (!best || p.length > best.prefix.length) {
          best = { bank, prefix: p };
        }
      }
    }
  }
  return best?.bank;
}

/** 자릿수 합이 일치하는 첫 그룹 패턴 반환 */
function pickGroupPattern(
  bank: BankPattern | undefined,
  digits: string,
): number[] | undefined {
  if (!bank) return undefined;
  return bank.groups.find(g => g.reduce((s, n) => s + n, 0) === digits.length);
}

/**
 * 은행별 그룹화로 포맷. 은행 미상 또는 패턴 불일치면 4자리 단위 default.
 */
export function formatAccountByBank(
  accountNumber: string,
  bankCode?: string,
): string {
  const digits = accountNumber.replace(/[^\d]/g, '');
  const bank = bankCode
    ? BANK_PATTERNS.find(b => b.code === bankCode)
    : undefined;
  const groups = pickGroupPattern(bank, digits);
  if (!groups) return defaultGroupFormat(digits);

  const out: string[] = [];
  let idx = 0;
  for (const len of groups) {
    out.push(digits.slice(idx, idx + len));
    idx += len;
  }
  return out.join('-');
}

function defaultGroupFormat(digits: string, size = 4): string {
  const out: string[] = [];
  for (let i = 0; i < digits.length; i += size) {
    out.push(digits.slice(i, i + size));
  }
  return out.join('-');
}
