import type { ParsedAccount } from '../services/ocr';

export type RootStackParamList = {
  AccountList: undefined;
  Camera: undefined;
  Crop: { sourceUri: string };
  Result: {
    accountId: string;
    candidates?: ParsedAccount[];
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
