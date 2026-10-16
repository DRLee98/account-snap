import { sortReadingOrder, joinReadingOrder } from '../src/services/ocr/readingOrder';
import type { TextBox } from '../src/services/ocr/readingOrder';
import { parseAccount } from '../src/services/ocr/clovaParser';
import { ClovaResponse } from '../src/services/ocr/types';

const box = (
  text: string,
  x: number,
  y: number,
  width = text.length * 40,
  height = 70,
): TextBox => ({ text, confidence: 0.95, x, y, width, height });

/**
 * 실제 오인식 사례를 재현한 좌표.
 * 간판이 오른쪽으로 갈수록 위로 올라가게 기울어져 있어, 숫자 줄의 끝 "93"이
 * 가장 위에 있다. CLOVA는 "93"을 "0141"보다 먼저 돌려줬고 그대로 이어붙이면
 * "352 8311 93 0141"(3528311930141)이 된다. 정답은 3528311014193.
 */
const tiltedSign: TextBox[] = [
  box('농협', 300, 420),
  box('/', 450, 415, 30),
  box('정원욱', 500, 405),
  box('352', 230, 530),
  box('8311', 380, 520),
  box('93', 760, 490),
  box('0141', 570, 505),
];

const clovaResponse = (boxes: TextBox[]): ClovaResponse => ({
  version: 'V2',
  requestId: 'test',
  timestamp: 0,
  images: [
    {
      inferResult: 'SUCCESS',
      message: 'SUCCESS',
      fields: boxes.map(b => ({
        inferText: b.text,
        inferConfidence: b.confidence,
        boundingPoly: {
          vertices: [
            { x: b.x, y: b.y },
            { x: b.x + b.width, y: b.y },
            { x: b.x + b.width, y: b.y + b.height },
            { x: b.x, y: b.y + b.height },
          ],
        },
      })),
    },
  ],
});

describe('sortReadingOrder', () => {
  it('기울어진 간판에서 줄 끝 단어가 먼저 와도 읽기 순서로 복원한다', () => {
    expect(joinReadingOrder(tiltedSign)).toBe('농협 / 정원욱 352 8311 0141 93');
  });

  it('입력 순서와 무관하게 같은 결과를 낸다', () => {
    const shuffled = [...tiltedSign].reverse();
    expect(joinReadingOrder(shuffled)).toBe('농협 / 정원욱 352 8311 0141 93');
  });

  it('세로로 떨어진 줄은 섞지 않는다 (위 줄 먼저)', () => {
    const boxes = [
      box('둘째줄', 100, 200),
      box('첫째줄', 100, 100),
      box('셋째줄', 100, 300),
    ];
    expect(sortReadingOrder(boxes).map(b => b.text)).toEqual([
      '첫째줄',
      '둘째줄',
      '셋째줄',
    ]);
  });

  it('같은 줄 안에서는 x 순서를 따른다', () => {
    const boxes = [box('C', 300, 100), box('A', 100, 100), box('B', 200, 100)];
    expect(joinReadingOrder(boxes)).toBe('A B C');
  });

  it('빈 입력은 빈 문자열', () => {
    expect(joinReadingOrder([])).toBe('');
  });
});

describe('parseAccount — CLOVA 필드 순서가 뒤섞인 경우', () => {
  it('boundingPoly로 재정렬해 올바른 계좌번호를 추출한다', () => {
    const parsed = parseAccount(clovaResponse(tiltedSign));
    expect(parsed?.accountNumber).toBe('3528311014193');
    expect(parsed?.bankName).toBe('농협은행');
  });

  it('좌표가 없는 필드가 섞여 있으면 원래 순서를 유지한다', () => {
    const response = clovaResponse(tiltedSign);
    delete response.images[0].fields[0].boundingPoly;
    const parsed = parseAccount(response);
    // 재정렬 불가 → CLOVA가 준 순서 그대로 (뒤섞인 결과를 그대로 반영)
    expect(parsed?.accountNumber).toBe('3528311930141');
  });
});
