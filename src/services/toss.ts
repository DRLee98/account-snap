import { Account } from '../models/account';
import { findBankByText } from './ocr/bankPatterns';

/**
 * 토스 송금 링크(bank=)가 인식하는 은행 표기. 실기기에서 확인된 값만 넣는다.
 * '국민은행'·'농협은행'·'기업은행'·'K뱅크'처럼 토스가 모르는 표기를 넘기면
 * 송금 화면이 에러를 내므로, 우리 앱의 정식 은행명을 그대로 넘기면 안 된다.
 * 목록에 없는 은행은 저장된 은행명을 그대로 넘긴다.
 */
const TOSS_BANK_NAMES: Record<string, string> = {
  '004': '국민',
  '088': '신한',
  '020': '우리',
  '081': '하나',
  '011': '농협',
  '003': '기업',
  '090': '카카오뱅크',
  '092': '토스뱅크',
  '089': '케이뱅크',
  '023': 'SC제일',
  '071': '우체국',
  '045': '새마을',
  '048': '신협',
};

export function tossBankName(
  account: Pick<Account, 'bankName' | 'bankCode'>,
): string {
  // 은행을 직접 입력해 코드가 없는 계좌도 이름으로 은행을 찾아 매핑한다
  const code = account.bankCode ?? findBankByText(account.bankName)?.code;
  return (code && TOSS_BANK_NAMES[code]) || account.bankName;
}

export function buildTossSendUrl(
  account: Pick<Account, 'bankName' | 'bankCode' | 'accountNumber'>,
): string {
  const bank = encodeURIComponent(tossBankName(account));
  const acctNo = account.accountNumber.replace(/[^\d]/g, '');
  return `supertoss://send?bank=${bank}&accountNo=${acctNo}&amount=`;
}
