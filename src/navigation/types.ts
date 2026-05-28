export type RootStackParamList = {
  AccountList: undefined;
  Camera: undefined;
  Result: { accountId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
