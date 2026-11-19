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
/** 줄 조각을 합칠 때: 두 줄의 세로 띠가 이만큼(줄 높이 기준) 겹치면 같은 줄 */
const ROW_MERGE_OVERLAP = 0.3;
/** 가로로 이만큼(좁은 쪽 너비 기준) 겹치는 상자가 있으면 위아래 다른 줄 */
const STACKED_OVERLAP = 0.3;
/** 상자 너비로 센 글자 수가 실제 글자 수와 이만큼 어긋나면 텍스트가 잘못 붙은 것으로 본다 */
const CHAR_COUNT_MISMATCH = 0.75;
/** 텍스트를 바꿔 끼운 뒤에는 이 안으로 들어와야 고친 것으로 인정한다 */
const CHAR_COUNT_OK = 0.5;
/** 자리를 맞바꿔 볼 상자의 최대 개수 (순열 수를 묶어두기 위함) */
const MAX_SWAP_BOXES = 4;

const verticalOverlapRatio = (a: TextBox, b: TextBox): number => {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = bottom - top;
  if (overlap <= 0) return 0;
  const minHeight = Math.min(a.height, b.height);
  return minHeight > 0 ? overlap / minHeight : 0;
};

const isFiniteBox = (b: TextBox) =>
  [b.x, b.y, b.width, b.height].every(Number.isFinite);

const horizontalOverlapRatio = (a: TextBox, b: TextBox): number => {
  const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const minWidth = Math.min(a.width, b.width);
  return overlap > 0 && minWidth > 0 ? overlap / minWidth : 0;
};

const medianHeight = (line: TextBox[]): number => {
  const hs = line.map(b => b.height).sort((a, b) => a - b);
  return hs[Math.floor(hs.length / 2)];
};

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const permutations = <T>(xs: T[]): T[][] => {
  if (xs.length <= 1) return [xs];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    permutations(rest).forEach(p => out.push([x, ...p]));
  });
  return out;
};

const isDigits = (t: string) => /^[0-9]+$/.test(t);

/**
 * 같은 줄의 숫자 덩어리 텍스트가 서로 다른 상자에 붙어 온 경우를 상자 너비로 바로잡는다.
 *
 * CLOVA는 간판처럼 휘거나 기운 사진에서 inferText를 엉뚱한 boundingPoly에 붙여 보낼 때가 있다
 * (실측 2026-11: "352 8311 0141 93" 간판에서 "0141" 자리 상자에 "93"이, "93" 자리 상자에
 * "0141"이 붙어 와 3528311930141이 됐다). 상자 위치는 맞으므로 x로 정렬해도 고쳐지지 않는다.
 *
 * 한 줄 안에서 글자당 폭은 거의 일정하다는 점을 쓴다. 글자당 폭의 중앙값으로 각 상자가
 * 몇 글자짜리인지 역산해, 실제 글자 수와 크게 어긋나는 상자들끼리만 텍스트를 바꿔 끼워 본다.
 * 모든 상자가 맞아떨어지는 배치가 하나 나올 때만 고치고, 아니면 원본을 그대로 둔다.
 *
 * 보수적으로 가는 이유: 원근 때문에 한쪽 끝 글자가 조금 커지는 건 정상이라, 글자 수가
 * 0.75자 이상 어긋날 때만 의심하고, 바꾼 뒤 0.5자 안으로 들어오는 경우만 받아들인다.
 */
export function repairSwappedTexts(line: TextBox[]): TextBox[] {
  const digits = line
    .map((box, index) => ({ box, index }))
    .filter(({ box }) => isDigits(box.text) && box.width > 0);
  // 기준이 될 글자당 폭을 중앙값으로 잡으려면 성한 상자가 더 많아야 한다
  if (digits.length < 3) return line;

  const unit = median(digits.map(({ box }) => box.width / box.text.length));
  if (!(unit > 0)) return line;

  const gap = (box: TextBox, text: string) =>
    Math.abs(box.width / unit - text.length);

  const bad = digits.filter(({ box }) => gap(box, box.text) >= CHAR_COUNT_MISMATCH);
  // 어긋난 상자가 성한 상자보다 많으면 중앙값 자체를 믿을 수 없다
  if (bad.length < 2 || bad.length > MAX_SWAP_BOXES) return line;
  if (bad.length > Math.floor(digits.length / 2)) return line;

  const texts = bad.map(({ box }) => box.text);
  for (const perm of permutations(texts)) {
    if (perm.every((t, i) => t === texts[i])) continue;
    if (!bad.every(({ box }, i) => gap(box, perm[i]) < CHAR_COUNT_OK)) continue;
    const fixed = [...line];
    bad.forEach(({ index }, i) => {
      fixed[index] = { ...line[index], text: perm[i] };
    });
    return fixed;
  }
  return line;
}

/**
 * 두 줄이 사실 한 줄의 조각인지.
 * - 가로로 겹치는 상자가 있으면 위아래로 쌓인 다른 줄이다
 * - 아니면 두 줄의 세로 띠(맨 위~맨 아래)가 줄 높이의 30% 이상 겹칠 때 같은 줄
 */
function isSameRow(a: TextBox[], b: TextBox[]): boolean {
  if (a.some(x => b.some(y => horizontalOverlapRatio(x, y) > STACKED_OVERLAP)))
    return false;
  const top = Math.max(
    Math.min(...a.map(t => t.y)),
    Math.min(...b.map(t => t.y)),
  );
  const bottom = Math.min(
    Math.max(...a.map(t => t.y + t.height)),
    Math.max(...b.map(t => t.y + t.height)),
  );
  const minHeight = Math.min(medianHeight(a), medianHeight(b));
  return minHeight > 0 && (bottom - top) / minHeight >= ROW_MERGE_OVERLAP;
}

/**
 * 왼쪽부터 훑으며 "바로 왼쪽 이웃"과 세로로 겹치면 같은 줄로 묶는다.
 * 줄 전체의 평균 y가 아니라 마지막 박스와 비교하므로, 기울어진 줄도
 * 점진적으로 올라가거나 내려가는 것을 따라갈 수 있다.
 *
 * 마지막 박스와만 비교하면, 가운데 한 덩어리가 반 칸쯤 처진 줄(휘어진 간판·원근)에서
 * 그 덩어리가 혼자 새 줄로 떨어지고 다음 덩어리가 그걸 건너뛰어 앞 줄에 붙는다
 * ("352 8311 0141 93" → "352 8311 93" + "0141"). 그래서 묶은 뒤 같은 줄의 조각을 다시 합치고,
 * 줄 안은 x 순서로 정렬한다.
 */
export function sortReadingOrder(boxes: TextBox[]): TextBox[] {
  // 좌표가 깨진 상자(NaN)는 정렬을 망가뜨리므로 맨 뒤에 원래 순서대로 둔다
  const broken = boxes.filter(b => !isFiniteBox(b));
  const byX = boxes.filter(isFiniteBox).sort((a, b) => a.x - b.x || a.y - b.y);
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

  // 같은 줄의 조각 합치기 — 더 합칠 게 없을 때까지
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < lines.length && !merged; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        if (isSameRow(lines[i], lines[j])) {
          lines[i] = [...lines[i], ...lines[j]];
          lines.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  lines.forEach(line => line.sort((a, b) => a.x - b.x));

  // 텍스트가 엉뚱한 상자에 붙어 온 줄을 상자 너비로 바로잡는다
  for (let i = 0; i < lines.length; i++) lines[i] = repairSwappedTexts(lines[i]);

  // 줄 순서는 각 줄의 첫 박스(왼쪽 끝) 세로 중심 기준 — 기울어져도 왼쪽 끝끼리 비교하면 안정적
  lines.sort((a, b) => {
    const ca = a[0].y + a[0].height / 2;
    const cb = b[0].y + b[0].height / 2;
    return ca - cb;
  });

  return [...lines.flat(), ...broken];
}

/** 읽기 순서로 정렬해 공백으로 이어붙인 텍스트 */
export const joinReadingOrder = (boxes: TextBox[]): string =>
  sortReadingOrder(boxes)
    .map(b => b.text)
    .join(' ');
