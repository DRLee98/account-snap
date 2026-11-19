import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';
import ResultScreen from '../src/screens/ResultScreen';
import AccountPhoto from '../src/components/AccountPhoto';
import type { Account } from '../src/models/account';
import type { ParsedAccount } from '../src/services/ocr';

let mockAccount: Account;
let mockParams: Record<string, unknown>;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn() }),
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('../src/components/AdFitBanner', () => ({
  __esModule: true,
  default: () => null,
  AD_CLIENT_IDS: {},
}));
jest.mock('../src/services/storage', () => ({
  getAccount: () => mockAccount,
  updateAccount: (_id: string, patch: Partial<Account>) => {
    mockAccount = { ...mockAccount, ...patch };
    return mockAccount;
  },
  markUsed: jest.fn(),
  deleteAccount: jest.fn(),
}));
jest.mock('../src/services/transfer/send', () => ({
  sendWithApp: jest.fn(async () => 'opened'),
}));
jest.mock('../src/services/transfer/preference', () => ({
  getTransferApp: () =>
    jest.requireActual('../src/services/transfer/apps').findTransferApp('toss'),
}));

const account = (patch: Partial<Account> = {}): Account =>
  ({
    id: 'a1',
    accountNumber: '11012345678901',
    bankName: '국민은행',
    bankCode: '004',
    holderName: '홍길동',
    isFavorite: false,
    sourceImageUri: 'file:///crop.jpg',
    createdAt: 0,
    deletedAt: null,
    ...patch,
  } as Account);

const kb: ParsedAccount = {
  accountNumber: '11012345678901',
  bankName: '국민은행',
  bankCode: '004',
  holderName: '홍길동',
  bankInferred: false,
  confidence: 0.9,
  regions: {
    bank: { x: 20, y: 10, width: 80, height: 20 },
    number: { x: 20, y: 50, width: 170, height: 20 },
  },
};
const kakao: ParsedAccount = {
  accountNumber: '3333012345678',
  bankName: '카카오뱅크',
  bankCode: '090',
  bankInferred: false,
  confidence: 0.7,
};

const texts = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

const sendButton = (root: ReactTestRenderer.ReactTestInstance) =>
  root.find(
    n =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.endsWith('송금하기') &&
      typeof n.type !== 'string',
  );

const render = async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<ResultScreen />);
  });
  return tree.root;
};

beforeEach(() => {
  jest.clearAllMocks();
  (Image as any).getSize = jest.fn((_uri, ok) => ok(200, 100));
});

test('계좌 하나: 확인 카드를 바로 보여 주고 저장 알림을 띄운다', async () => {
  mockAccount = account();
  mockParams = { accountId: 'a1', options: [kb], regionUnit: 'px' };
  const root = await render();
  const all = texts(root);
  expect(all).toEqual(
    expect.arrayContaining([
      '은행',
      '국민은행',
      '계좌번호',
      '복사',
      '국민은행 계좌번호 형식(14자리)과 맞아요',
      '사진의 같은 색 상자에서 읽은 값이에요 · 눌러서 고칠 수 있어요',
    ]),
  );
  expect(all.some(t => t.includes('계좌가'))).toBe(false);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'saved',
      text1: '목록에 저장하고 계좌번호를 복사했어요',
    }),
  );
  expect(sendButton(root).props.disabled).toBe(false);
});

test('계좌가 여러 개: 먼저 고르게 하고, 고르면 확인 카드로 바뀐다', async () => {
  mockAccount = account();
  mockParams = { accountId: 'a1', options: [kb, kakao], regionUnit: 'px' };
  const root = await render();
  expect(texts(root)).toEqual(
    expect.arrayContaining([
      '사진에서 계좌가 2개 보여요',
      '보낼 계좌를 골라 주세요',
      '누르면 계좌 정보를 확인하고 고칠 수 있어요',
    ]),
  );
  expect(sendButton(root).props.disabled).toBe(true);
  expect(Toast.show).not.toHaveBeenCalled();

  // 카카오뱅크 카드를 누른다
  const kakaoCard = root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      texts(n).includes('3333-01-2345678'),
  )[0];
  await act(async () => {
    kakaoCard.props.onPress();
  });

  expect(mockAccount.accountNumber).toBe('3333012345678');
  expect(mockAccount.bankCode).toBe('090');
  expect(Clipboard.setString).toHaveBeenCalledWith('3333012345678');
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'saved' }),
  );
  const all = texts(root);
  expect(all).toEqual(
    expect.arrayContaining([
      '사진에서 계좌 2개를 찾았어요',
      '다른 계좌로 바꾸기',
      '카카오뱅크',
    ]),
  );
  expect(sendButton(root).props.disabled).toBe(false);
});

test('은행을 계좌번호로 추정했으면 주황색 안내와 함께 추정 은행을 보여 준다', async () => {
  mockAccount = account({
    accountNumber: '3333012345678',
    bankName: '카카오뱅크',
    bankCode: '090',
  });
  mockParams = {
    accountId: 'a1',
    options: [{ ...kakao, bankInferred: true }],
  };
  const root = await render();
  const all = texts(root);
  expect(all).toEqual(
    expect.arrayContaining([
      '카카오뱅크',
      '사진에 은행이 없어 계좌번호로 추정했어요.\n다른 은행이면 눌러서 바꿔 주세요',
    ]),
  );
  // 추정 은행은 형식 확인 표시를 하지 않는다
  expect(all.some(t => t.includes('형식'))).toBe(false);
});

test('은행을 못 찾았으면 고르라고 안내하고 송금 버튼 설명도 바꾼다', async () => {
  mockAccount = account({ bankName: '(은행 미확인)', bankCode: undefined });
  mockParams = { accountId: 'a1' };
  const root = await render();
  expect(texts(root)).toEqual(
    expect.arrayContaining([
      '선택해 주세요',
      '사진에서 은행을 찾지 못했어요.\n고르면 송금 앱에 계좌까지 채워져요',
      '은행을 고르면 계좌까지 채워진 화면이 열려요',
    ]),
  );
});

test('사진 위에 읽은 자리를 색 상자로 표시한다', async () => {
  mockAccount = account();
  mockParams = { accountId: 'a1', options: [kb], regionUnit: 'px' };
  const root = await render();
  const box = root
    .findByType(AccountPhoto)
    .find(n => typeof n.props.onLayout === 'function');
  await act(async () => {
    box.props.onLayout({
      nativeEvent: { layout: { width: 350 } },
      persist: () => {},
    });
  });
  expect(root.findAll(n => n.props.testID === 'region-bank')).not.toHaveLength(
    0,
  );
  expect(
    root.findAll(n => n.props.testID === 'region-number'),
  ).not.toHaveLength(0);
  expect(root.findAll(n => n.props.testID === 'region-holder')).toHaveLength(0);
});
