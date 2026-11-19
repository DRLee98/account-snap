import {
  canRead,
  pointCount,
  strokesBounds,
  strokesToPath,
} from '../src/services/crop/strokes';

const bank = [
  { x: 160, y: 210 },
  { x: 230, y: 210 },
];
const number = [
  { x: 90, y: 246 },
  { x: 200, y: 246 },
  { x: 300, y: 244 },
];

test('여러 획은 획마다 새로 시작하는 path가 된다 (획 사이를 잇지 않음)', () => {
  expect(strokesToPath([bank, number])).toBe(
    'M160,210 L230,210 M90,246 L200,246 L300,244',
  );
  expect(strokesToPath([])).toBe('');
  expect(strokesToPath([[]])).toBe('');
});

test('점이 2개 이상이어야 읽을 수 있다', () => {
  expect(canRead([])).toBe(false);
  expect(canRead([[{ x: 1, y: 1 }]])).toBe(false);
  expect(canRead([[{ x: 1, y: 1 }], [{ x: 5, y: 5 }]])).toBe(true);
  expect(pointCount([bank, number])).toBe(5);
});

test('잘라낼 영역은 모든 획을 감싸고 붓 두께만큼 넓히되 사진 밖은 자른다', () => {
  expect(strokesBounds([bank, number], 30, { w: 390, h: 520 })).toEqual({
    minX: 60,
    minY: 180,
    maxX: 330,
    maxY: 276,
  });
  expect(strokesBounds([[{ x: 5, y: 510 }]], 30, { w: 390, h: 520 })).toEqual({
    minX: 0,
    minY: 480,
    maxX: 35,
    maxY: 520,
  });
  expect(strokesBounds([], 30, { w: 390, h: 520 })).toBeNull();
});

test('되돌리기는 마지막 획만 지운다', () => {
  const strokes = [bank, number];
  const undone = strokes.slice(0, -1);
  expect(strokesToPath(undone)).toBe('M160,210 L230,210');
});
