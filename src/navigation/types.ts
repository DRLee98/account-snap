import type { ParsedAccount, RegionUnit } from '../services/ocr';

export type RootStackParamList = {
  AccountList: undefined;
  Camera: undefined;
  Crop: { sourceUri: string };
  Result: {
    accountId: string;
    /**
     * 사진에서 찾은 계좌들 — 첫 번째가 저장된 대표 계좌, 나머지는 다른 후보.
     * 2개 이상이면 결과 화면이 "계좌 고르기"로 열린다.
     */
    options?: ParsedAccount[];
    /** options[].regions 좌표 단위 */
    regionUnit?: RegionUnit;
  };
  Edit: { accountId: string };
  TransferApp: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
