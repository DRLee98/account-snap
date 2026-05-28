import { storage } from './mmkv';
import {
  Account,
  NewAccountInput,
  normalizeAccountNumber,
} from '../../models/account';

const KEY_LIST = 'accounts:list';
const KEY_LAST_USED_ID = 'accounts:lastUsedId';

const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const readAll = (): Account[] => {
  const raw = storage.getString(KEY_LIST);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
};

const writeAll = (accounts: Account[]): void => {
  storage.set(KEY_LIST, JSON.stringify(accounts));
};

export const listAccounts = (): Account[] =>
  readAll().filter(a => a.deletedAt === null);

export const listFavorites = (): Account[] =>
  listAccounts()
    .filter(a => a.isFavorite)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));

export const listHistory = (): Account[] =>
  listAccounts().sort((a, b) => b.createdAt - a.createdAt);

export const getAccount = (id: string): Account | undefined =>
  readAll().find(a => a.id === id && a.deletedAt === null);

export const getLastUsedAccount = (): Account | undefined => {
  const id = storage.getString(KEY_LAST_USED_ID);
  return id ? getAccount(id) : undefined;
};

export const createAccount = (input: NewAccountInput): Account => {
  const now = Date.now();
  const account: Account = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    accountNumber: normalizeAccountNumber(input.accountNumber),
    bankName: input.bankName,
    bankCode: input.bankCode,
    holderName: input.holderName,
    label: input.label,
    isFavorite: input.isFavorite ?? false,
    sourceImageUri: input.sourceImageUri,
    ocrRawText: input.ocrRawText,
  };
  writeAll([...readAll(), account]);
  return account;
};

export const updateAccount = (
  id: string,
  patch: Partial<Omit<Account, 'id' | 'createdAt'>>,
): Account | undefined => {
  const all = readAll();
  const idx = all.findIndex(a => a.id === id);
  if (idx < 0) return undefined;
  const next: Account = {
    ...all[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  all[idx] = next;
  writeAll(all);
  return next;
};

export const toggleFavorite = (id: string): Account | undefined =>
  updateAccount(id, {
    isFavorite: !getAccount(id)?.isFavorite,
  });

export const markUsed = (id: string): Account | undefined => {
  const updated = updateAccount(id, { lastUsedAt: Date.now() });
  if (updated) storage.set(KEY_LAST_USED_ID, id);
  return updated;
};

export const deleteAccount = (id: string): void => {
  updateAccount(id, { deletedAt: Date.now() });
};

export const clearAll = (): void => {
  storage.delete(KEY_LIST);
  storage.delete(KEY_LAST_USED_ID);
};
