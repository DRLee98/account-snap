import { findBankByText } from './bankPatterns';
import { sortReadingOrder, TextBox } from './readingOrder';

/** 사진 안 사각형. 단위는 OCR 결과를 따른다 (RegionUnit) */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * - px: 사진 픽셀 (CLOVA, Android ML Kit)
 * - normalized: 사진 크기 대비 0~1, 왼쪽 위 원점 (iOS Vision — 네이티브에서 y를 뒤집어 둠)
 */
export type RegionUnit = 'px' | 'normalized';

/** 결과 화면이 사진 위에 색 상자로 표시하는 자리 */
export type AccountRegions = {
  bank?: Rect;
  number?: Rect;
  holder?: Rect;
};

type Target = {
  accountNumber: string;
  bankCode?: string;
  holderName?: string;
  /** 은행을 사진 글자에서 찾았을 때만 은행 자리를 표시 (계좌번호로 추정했으면 사진에 없음) */
  bankFromText: boolean;
};

const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

const union = (boxes: TextBox[]): Rect => {
  const x = Math.min(...boxes.map(b => b.x));
  const y = Math.min(...boxes.map(b => b.y));
  const right = Math.max(...boxes.map(b => b.x + b.width));
  const bottom = Math.max(...boxes.map(b => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
};

/**
 * 계좌번호 자리: 읽기 순서로 이어 붙인 숫자에 계좌번호가 들어가는 가장 짧은 연속 박스 묶음.
 * 번호가 "110123 45 678901"처럼 여러 박스로 나뉘어 있어도 찾는다.
 */
function findNumber(sorted: TextBox[], digits: string): Rect | undefined {
  if (!digits) return undefined;
  let best: TextBox[] | undefined;
  for (let i = 0; i < sorted.length; i++) {
    if (!digitsOf(sorted[i].text)) continue;
    let acc = '';
    for (let j = i; j < sorted.length; j++) {
      acc += digitsOf(sorted[j].text);
      if (acc.includes(digits)) {
        const span = sorted.slice(i, j + 1);
        if (!best || span.length < best.length) best = span;
        break;
      }
      if (acc.length > digits.length + 8) break;
    }
  }
  return best ? union(best) : undefined;
}

/** OCR 글자 박스에서 은행·계좌번호·예금주가 있던 자리를 찾는다. 못 찾은 항목은 비워 둔다 */
export function locateAccount(
  boxes: TextBox[],
  target: Target,
): AccountRegions {
  const sorted = sortReadingOrder(boxes);
  const regions: AccountRegions = {};

  const number = findNumber(sorted, digitsOf(target.accountNumber));
  if (number) regions.number = number;

  if (target.bankFromText && target.bankCode) {
    const box = sorted.find(
      b => findBankByText(b.text)?.code === target.bankCode,
    );
    if (box) regions.bank = union([box]);
  }

  if (target.holderName) {
    const box = sorted.find(b => b.text.includes(target.holderName!));
    if (box) regions.holder = union([box]);
  }

  return regions;
}

/** 영역을 사진 크기 대비 비율(0~1)로 바꾼다 */
export function normalizeRect(
  rect: Rect,
  unit: RegionUnit,
  imageWidth: number,
  imageHeight: number,
): Rect {
  if (unit === 'normalized') return rect;
  return {
    x: rect.x / imageWidth,
    y: rect.y / imageHeight,
    width: rect.width / imageWidth,
    height: rect.height / imageHeight,
  };
}
