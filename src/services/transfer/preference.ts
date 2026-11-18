import { Platform } from 'react-native';
import { storage } from '../storage/mmkv';
import {
  DEFAULT_TRANSFER_APP_ID,
  TransferApp,
  TransferAppId,
  findTransferApp,
  transferAppsFor,
} from './apps';

const KEY_TRANSFER_APP = 'settings:transferAppId';

const currentPlatform = (): 'ios' | 'android' =>
  Platform.OS === 'android' ? 'android' : 'ios';

/** 저장된 주거래 앱. 없거나 이 플랫폼에서 못 여는 앱이면 기본(토스). */
export function resolveTransferApp(
  storedId: string | undefined,
  platform: 'ios' | 'android',
): TransferApp {
  const available = transferAppsFor(platform);
  return (
    available.find(app => app.id === storedId) ??
    findTransferApp(DEFAULT_TRANSFER_APP_ID)!
  );
}

export function getTransferApp(): TransferApp {
  return resolveTransferApp(
    storage.getString(KEY_TRANSFER_APP),
    currentPlatform(),
  );
}

export function setTransferAppId(id: TransferAppId): void {
  storage.set(KEY_TRANSFER_APP, id);
}

export function availableTransferApps(): TransferApp[] {
  return transferAppsFor(currentPlatform());
}
