import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import TransferAppScreen from '../src/screens/TransferAppScreen';
import { storage } from '../src/services/storage/mmkv';

jest.mock('../src/services/storage/mmkv', () => {
  const data = new Map<string, string>();
  return {
    storage: {
      getString: jest.fn((k: string) => data.get(k)),
      set: jest.fn((k: string, v: string) => data.set(k, v)),
    },
  };
});

const texts = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

const radios = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAll(
    n => n.props.accessibilityRole === 'radio' && typeof n.type !== 'string',
    { deep: false },
  );

test('주거래 은행 화면: 처음엔 토스가 선택돼 있고, 누르면 선택이 저장된다', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<TransferAppScreen />);
  });
  const all = texts(tree.root);
  expect(all).toEqual(
    expect.arrayContaining([
      '계좌까지 자동으로 입력돼요',
      '은행·계좌번호가 채워진 송금 화면이 열려요',
      '계좌번호를 복사하고 앱을 열어요',
      '앱을 열지 않기',
      '토스',
      'KB스타뱅킹',
      '계좌번호만 복사',
    ]),
  );
  // iOS 테스트 환경: 경남은행은 빠진다. 실험 기능 묶음은 없다
  expect(all).not.toContain('BNK경남은행');
  expect(all).not.toContain('실험 기능');
  expect(all).not.toContain('기본');
  // 예금주는 채워지지 않으므로 '받는 사람'이라고 쓰지 않는다
  expect(all.filter(t => t.includes('받는 사람'))).toEqual([]);

  const checked = () =>
    radios(tree.root)
      .filter(r => r.props.accessibilityState?.checked)
      .map(r => r.props.accessibilityLabel);
  expect(checked()).toEqual([expect.stringMatching(/^토스/)]);

  const kbRow = radios(tree.root).find(r =>
    r.props.accessibilityLabel.startsWith('KB스타뱅킹'),
  )!;
  await act(async () => {
    kbRow.props.onPress();
  });
  expect(storage.set).toHaveBeenCalledWith('settings:transferAppId', 'kb');
  expect(checked()).toEqual([expect.stringMatching(/^KB스타뱅킹/)]);
});
