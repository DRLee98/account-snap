import {
  BACKUP_VERSION,
  mergeBackupAccounts,
  parseBackup,
  serializeBackup,
} from '../src/services/backup';
import { Account } from '../src/models/account';

const account = (over: Partial<Account>): Account => ({
  id: 'id-1',
  createdAt: 1000,
  updatedAt: 1000,
  deletedAt: null,
  accountNumber: '1002123456789',
  bankName: '우리은행',
  bankCode: '020',
  isFavorite: false,
  ...over,
});

describe('serializeBackup / parseBackup', () => {
  it('내보낸 백업을 그대로 다시 읽을 수 있다 (이미지 URI 제외)', () => {
    const src = account({
      sourceImageUri: 'file:///tmp/a.jpg',
      originalImageUri: 'file:///tmp/b.jpg',
      label: '가게',
      holderName: '홍길동',
    });
    const json = serializeBackup([src], 12345);
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('account-snap');
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBe(12345);
    expect(parsed.accounts[0].sourceImageUri).toBeUndefined();
    expect(parsed.accounts[0].originalImageUri).toBeUndefined();

    const restored = parseBackup(json);
    expect(restored).toHaveLength(1);
    expect(restored[0].accountNumber).toBe('1002123456789');
    expect(restored[0].label).toBe('가게');
  });

  it('JSON이 아니거나 다른 앱 파일이면 throw', () => {
    expect(() => parseBackup('not json')).toThrow('JSON 파싱 실패');
    expect(() => parseBackup('{"app":"other","accounts":[]}')).toThrow(
      '스냅넘버 백업 파일이 아니에요',
    );
  });

  it('미래 버전 백업은 거부한다', () => {
    const json = JSON.stringify({
      app: 'account-snap',
      version: BACKUP_VERSION + 1,
      accounts: [account({})],
    });
    expect(() => parseBackup(json)).toThrow('지원하지 않는 백업 버전');
  });

  it('깨진 항목은 걸러내고, 유효 항목이 없으면 throw', () => {
    const json = JSON.stringify({
      app: 'account-snap',
      version: 1,
      accounts: [{ id: '', accountNumber: '' }, account({ id: 'ok' })],
    });
    expect(parseBackup(json)).toHaveLength(1);

    const empty = JSON.stringify({
      app: 'account-snap',
      version: 1,
      accounts: [{ bad: true }],
    });
    expect(() => parseBackup(empty)).toThrow('가져올 수 있는 계좌가 없어요');
  });

  it('계좌번호의 하이픈은 정규화한다', () => {
    const json = JSON.stringify({
      app: 'account-snap',
      version: 1,
      accounts: [account({ accountNumber: '1002-123-456789' })],
    });
    expect(parseBackup(json)[0].accountNumber).toBe('1002123456789');
  });
});

describe('mergeBackupAccounts', () => {
  it('새 계좌는 추가한다', () => {
    const incoming = [account({ id: 'new-1', accountNumber: '3333123412345' })];
    const { next, result } = mergeBackupAccounts([account({})], incoming);
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(next).toHaveLength(2);
  });

  it('같은 id는 updatedAt이 최신인 쪽이 이긴다 (이미지 URI는 유지)', () => {
    const existing = account({
      updatedAt: 1000,
      label: '옛 별칭',
      sourceImageUri: 'file:///keep.jpg',
    });
    const newer = { ...account({ updatedAt: 2000, label: '새 별칭' }) };
    delete (newer as any).sourceImageUri;

    const { next, result } = mergeBackupAccounts([existing], [newer]);
    expect(result.updated).toBe(1);
    expect(next[0].label).toBe('새 별칭');
    expect(next[0].sourceImageUri).toBe('file:///keep.jpg');

    const older = account({ updatedAt: 500, label: '더 옛 별칭' });
    const r2 = mergeBackupAccounts([existing], [older]);
    expect(r2.result.skipped).toBe(1);
    expect(r2.next[0].label).toBe('옛 별칭');
  });

  it('id가 달라도 살아있는 같은 계좌번호면 건너뛴다', () => {
    const incoming = [account({ id: 'other-id' })];
    const { next, result } = mergeBackupAccounts([account({})], incoming);
    expect(result.skipped).toBe(1);
    expect(next).toHaveLength(1);
  });

  it('백업 내 중복도 한 번만 추가된다', () => {
    const incoming = [
      account({ id: 'a', accountNumber: '3333123412345' }),
      account({ id: 'b', accountNumber: '3333123412345' }),
    ];
    const { next, result } = mergeBackupAccounts([], incoming);
    expect(result).toEqual({ created: 1, updated: 0, skipped: 1 });
    expect(next).toHaveLength(1);
  });
});
