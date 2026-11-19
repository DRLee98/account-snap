import { ClovaField, ClovaResponse, ParsedAccount } from './types';
import { parseAccountFromText } from './textParser';
import { TextBox, joinReadingOrder } from './readingOrder';

const toBox = (field: ClovaField): TextBox | null => {
  const vertices = field.boundingPoly?.vertices;
  if (!vertices || vertices.length === 0) return null;
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    text: field.inferText,
    confidence: field.inferConfidence,
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
};

/** CLOVA 필드의 글자 박스 (픽셀). 좌표가 하나라도 없으면 null */
export function clovaBoxes(fields: ClovaField[]): TextBox[] | null {
  const boxes = fields.map(toBox);
  return boxes.some(b => b === null) ? null : (boxes as TextBox[]);
}

/**
 * CLOVA 필드를 읽기 순서로 이어붙인 텍스트.
 * CLOVA가 주는 필드 순서는 기울어진 사진에서 뒤섞일 수 있으므로
 * boundingPoly 좌표로 직접 정렬한다. 좌표가 하나라도 없으면 원래 순서 유지.
 */
export function joinClovaFields(fields: ClovaField[]): string {
  const boxes = clovaBoxes(fields);
  if (!boxes) return fields.map(f => f.inferText).join(' ');
  return joinReadingOrder(boxes);
}

export function parseAccount(response: ClovaResponse): ParsedAccount | null {
  const fields = response.images[0]?.fields ?? [];
  const joined = joinClovaFields(fields);

  // 신뢰도
  const avgConf =
    fields.length > 0
      ? fields.reduce((s, f) => s + (f.inferConfidence || 0), 0) / fields.length
      : 0.5;

  return parseAccountFromText(joined, avgConf);
}
