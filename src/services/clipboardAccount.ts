import Clipboard from '@react-native-clipboard/clipboard';
import { ParsedAccount, parseAccountFromText } from './ocr';
import { listAccounts, storage } from './storage';

const KEY_LAST_SEEN = 'clipboard:lastSeenNumber';

// 카톡 대화 전체 붙여넣기 등 비정상적으로 긴 텍스트는 파싱하지 않음
const MAX_TEXT_LENGTH = 2000;

export type ClipboardAccount = {
  parsed: ParsedAccount;
  rawText: string;
};

/**
 * 같은 계좌로 반복해서 묻지 않기 위한 판단 규칙.
 * - 이미 무시/저장 처리한 번호(lastSeen)면 스킵
 * - 이미 저장된 계좌면 스킵 (앱이 스스로 복사한 번호 포함)
 */
export const shouldPromptClipboardAccount = (
  parsed: ParsedAccount | null,
  existingNumbers: string[],
  lastSeenNumber: string | null,
): parsed is ParsedAccount => {
  if (!parsed) return false;
  if (parsed.accountNumber === lastSeenNumber) return false;
  if (existingNumbers.includes(parsed.accountNumber)) return false;
  return true;
};

/**
 * 클립보드에 새 계좌번호가 있으면 반환, 아니면 null.
 * OCR 호출 없이 텍스트 파서만 사용하므로 비용이 들지 않는다.
 */
export async function detectClipboardAccount(): Promise<ClipboardAccount | null> {
  try {
    if (!(await Clipboard.hasString())) return null;
    const text = await Clipboard.getString();
    if (!text || text.length > MAX_TEXT_LENGTH) return null;

    const parsed = parseAccountFromText(text);
    const existingNumbers = listAccounts().map(a => a.accountNumber);
    const lastSeen = storage.getString(KEY_LAST_SEEN) ?? null;
    if (!shouldPromptClipboardAccount(parsed, existingNumbers, lastSeen)) {
      return null;
    }
    return { parsed, rawText: text };
  } catch {
    // 클립보드 접근 실패는 조용히 무시 — 감지 기능은 best-effort
    return null;
  }
}

/** 저장했든 무시했든, 이 번호로는 다시 묻지 않는다. */
export const markClipboardAccountSeen = (accountNumber: string): void => {
  storage.set(KEY_LAST_SEEN, accountNumber);
};
