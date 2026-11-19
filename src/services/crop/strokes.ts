/**
 * 칠하기 화면의 붓질 — 손을 뗐다 다시 칠하면 새 획이 더해진다.
 * 되돌리기는 마지막 획만, 전체 지우기는 모두 지운다.
 */
export type Point = { x: number; y: number };
export type Stroke = Point[];

export const pointCount = (strokes: Stroke[]): number =>
  strokes.reduce((n, s) => n + s.length, 0);

/** 읽기에 쓸 만큼 칠했는지 — 점이 2개 이상이면 선이 생긴다 */
export const canRead = (strokes: Stroke[]): boolean => pointCount(strokes) >= 2;

/** SVG path. 획마다 M으로 새로 시작해 획 사이가 이어지지 않는다 */
export function strokesToPath(strokes: Stroke[]): string {
  return strokes
    .filter(s => s.length > 0)
    .map(s => s.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '))
    .join(' ');
}

/** 칠한 곳 전체를 감싸는 사각형 — 붓 두께의 절반과 여백만큼 넓히고 사진 밖은 자른다 */
export function strokesBounds(
  strokes: Stroke[],
  grow: number,
  limit: { w: number; h: number },
) {
  const points = strokes.flat();
  if (points.length === 0) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.max(0, Math.min(...xs) - grow);
  const minY = Math.max(0, Math.min(...ys) - grow);
  const maxX = Math.min(limit.w, Math.max(...xs) + grow);
  const maxY = Math.min(limit.h, Math.max(...ys) + grow);
  return { minX, minY, maxX, maxY };
}
