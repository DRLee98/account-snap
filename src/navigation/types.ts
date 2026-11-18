import type { ParsedAccount } from '../services/ocr';

export type RootStackParamList = {
  AccountList: undefined;
  Camera: undefined;
  Crop: { sourceUri: string };
  Result: {
    accountId: string;
    candidates?: ParsedAccount[];
  };
  Edit: { accountId: string };
  TransferApp: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
