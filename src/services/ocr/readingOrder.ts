/**
 * OCR 텍스트 박스를 읽기 순서(위→아래, 왼→오른쪽)로 정렬.
 *
 * OCR 엔진(CLOVA 필드, Vision 관측, ML Kit 라인)이 돌려주는 순서는
 * 읽기 순서를 보장하지 않는다. 특히 간판이 기울어진 사진에서는
 * 오른쪽 끝 단어가 위로 올라가 있어 순서가 뒤섞인다
 * ("352 8311 0141 93"이 "352 8311 93 0141"로 들어오는 식).
 *
 * 좌표 단위는 결과 안에서만 일관되면 된다 (픽셀, 정규화 모두 가능).
 */
export type TextBox = {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 같은 줄로 볼 최소 세로 겹침 비율 (작은 쪽 높이 기준) */
const SAME_LINE_OVERLAP = 0.5;

const verticalOverlapRatio = (a: TextBox, b: TextBox): number => {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = bottom - top;
  if (overlap <= 0) return 0;
  const minHeight = Math.min(a.height, b.height);
  return minHeight > 0 ? overlap / minHeight : 0;
};

/**
 * 왼쪽부터 훑으며 "바로 왼쪽 이웃"과 세로로 겹치면 같은 줄로 묶는다.
 * 줄 전체의 평균 y가 아니라 마지막 박스와 비교하므로, 기울어진 줄도
 * 점진적으로 올라가거나 내려가는 것을 따라갈 수 있다.
 */
export function sortReadingOrder(boxes: TextBox[]): TextBox[] {
  const byX = [...boxes].sort((a, b) => a.x - b.x || a.y - b.y);
  const lines: TextBox[][] = [];

  for (const box of byX) {
    let best: TextBox[] | undefined;
    let bestOverlap = 0;
    for (const line of lines) {
      const overlap = verticalOverlapRatio(line[line.length - 1], box);
      if (overlap >= SAME_LINE_OVERLAP && overlap > bestOverlap) {
        best = line;
        bestOverlap = overlap;
      }
    }
    if (best) best.push(box);
    else lines.push([box]);
  }

  // 줄 순서는 각 줄의 첫 박스(왼쪽 끝) 세로 중심 기준 — 기울어져도 왼쪽 끝끼리 비교하면 안정적
  lines.sort((a, b) => {
    const ca = a[0].y + a[0].height / 2;
    const cb = b[0].y + b[0].height / 2;
    return ca - cb;
  });

  return lines.flat();
}

/** 읽기 순서로 정렬해 공백으로 이어붙인 텍스트 */
export const joinReadingOrder = (boxes: TextBox[]): string =>
  sortReadingOrder(boxes)
    .map(b => b.text)
    .join(' ');
