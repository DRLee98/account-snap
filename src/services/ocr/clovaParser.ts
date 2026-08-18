import { ClovaResponse, ParsedAccount } from './types';
import { parseAccountFromText } from './textParser';

export function parseAccount(response: ClovaResponse): ParsedAccount | null {
  const fields = response.images[0]?.fields ?? [];
  const joined = fields.map(f => f.inferText).join(' ');

  // 신뢰도
  const avgConf =
    fields.length > 0
      ? fields.reduce((s, f) => s + (f.inferConfidence || 0), 0) / fields.length
      : 0.5;

  return parseAccountFromText(joined, avgConf);
}
