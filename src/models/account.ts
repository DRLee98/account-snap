export type Account = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;

  accountNumber: string;
  bankName: string;
  bankCode?: string;
  holderName?: string;

  label?: string;
  isFavorite: boolean;
  lastUsedAt?: number;

  sourceImageUri?: string;
  /** brush로 자르기 전 원본 사진 (영역 다시 칠하기에 사용) */
  originalImageUri?: string;
  ocrRawText?: string;
};

export type NewAccountInput = Pick<
  Account,
  'accountNumber' | 'bankName'
> &
  Partial<
    Pick<
      Account,
      | 'bankCode'
      | 'holderName'
      | 'label'
      | 'isFavorite'
      | 'sourceImageUri'
      | 'originalImageUri'
      | 'ocrRawText'
    >
  >;

export const normalizeAccountNumber = (value: string): string =>
  value.replace(/[^\d]/g, '');

export const formatAccountNumber = (
  value: string,
  groupSize = 4,
): string => {
  const digits = normalizeAccountNumber(value);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += groupSize) {
    groups.push(digits.slice(i, i + groupSize));
  }
  return groups.join('-');
};

// 은행별 포맷이 필요할 때는 src/services/ocr/bankPatterns의 formatAccountByBank 사용
