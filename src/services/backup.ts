import { Account, normalizeAccountNumber } from '../models/account';

/**
 * 백업 파일 포맷 (JSON).
 *
 * 이미지 URI(sourceImageUri/originalImageUri)는 기기 로컬 경로라
 * 다른 기기에서 의미가 없으므로 백업에서 제외한다.
 * 필드 구성은 DAT-003 클라우드 동기화 포맷의 선행 버전 역할을 한다.
 */
export const BACKUP_APP = 'account-snap';
export const BACKUP_VERSION = 1;

export type BackupAccount = Omit<
  Account,
  'sourceImageUri' | 'originalImageUri'
>;

export type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  accounts: BackupAccount[];
};

export type MergeResult = {
  created: number;
  updated: number;
  skipped: number;
};

const toBackupAccount = (a: Account): BackupAccount => ({
  id: a.id,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  deletedAt: a.deletedAt,
  accountNumber: a.accountNumber,
  bankName: a.bankName,
  bankCode: a.bankCode,
  holderName: a.holderName,
  label: a.label,
  isFavorite: a.isFavorite,
  lastUsedAt: a.lastUsedAt,
  ocrRawText: a.ocrRawText,
});

export const serializeBackup = (
  accounts: Account[],
  exportedAt = Date.now(),
): string => {
  const file: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    accounts: accounts.map(toBackupAccount),
  };
  return JSON.stringify(file, null, 2);
};

const isValidBackupAccount = (a: any): a is BackupAccount =>
  a != null &&
  typeof a === 'object' &&
  typeof a.id === 'string' &&
  a.id.length > 0 &&
  typeof a.accountNumber === 'string' &&
  normalizeAccountNumber(a.accountNumber).length > 0 &&
  typeof a.bankName === 'string';

/**
 * 백업 JSON 파싱 + 검증. 형식이 아니면 throw, 항목 단위 오류는 걸러낸다.
 */
export const parseBackup = (json: string): BackupAccount[] => {
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('백업 파일 형식이 아니에요 (JSON 파싱 실패)');
  }
  if (data?.app !== BACKUP_APP || !Array.isArray(data?.accounts)) {
    throw new Error('스냅넘버 백업 파일이 아니에요');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new Error(
      `지원하지 않는 백업 버전이에요 (v${data.version}). 앱을 업데이트해주세요.`,
    );
  }

  const now = Date.now();
  const accounts = (data.accounts as any[])
    .filter(isValidBackupAccount)
    .map(a => ({
      ...a,
      accountNumber: normalizeAccountNumber(a.accountNumber),
      createdAt: typeof a.createdAt === 'number' ? a.createdAt : now,
      updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : now,
      deletedAt: typeof a.deletedAt === 'number' ? a.deletedAt : null,
      isFavorite: a.isFavorite === true,
    }));

  if (accounts.length === 0) {
    throw new Error('가져올 수 있는 계좌가 없어요');
  }
  return accounts;
};

/**
 * 백업 계좌를 기존 목록에 병합 (순수 함수).
 *
 * - 같은 id: updatedAt이 더 최신인 쪽이 이김 (이미지 URI는 기존 것 유지)
 * - id는 다르지만 살아있는 같은 계좌번호: 중복으로 보고 스킵
 * - 그 외: 새로 추가
 */
export const mergeBackupAccounts = (
  existing: Account[],
  incoming: BackupAccount[],
): { next: Account[]; result: MergeResult } => {
  const next = [...existing];
  const idxById = new Map(existing.map((a, i) => [a.id, i]));
  const liveNumbers = new Set(
    existing.filter(a => a.deletedAt === null).map(a => a.accountNumber),
  );
  const result: MergeResult = { created: 0, updated: 0, skipped: 0 };

  for (const inc of incoming) {
    const idx = idxById.get(inc.id);
    if (idx !== undefined) {
      const cur = next[idx];
      if (inc.updatedAt > cur.updatedAt) {
        next[idx] = {
          ...cur,
          ...inc,
        };
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
      continue;
    }
    if (inc.deletedAt === null && liveNumbers.has(inc.accountNumber)) {
      result.skipped += 1;
      continue;
    }
    next.push({ ...inc });
    idxById.set(inc.id, next.length - 1);
    if (inc.deletedAt === null) liveNumbers.add(inc.accountNumber);
    result.created += 1;
  }

  return { next, result };
};
