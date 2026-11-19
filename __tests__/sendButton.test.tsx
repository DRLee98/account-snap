import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import SendButton, {
  sendButtonColors,
  sendButtonSubtitle,
} from '../src/components/SendButton';
import { findTransferApp, TRANSFER_APPS } from '../src/services/transfer/apps';

const app = (id: string) => {
  const found = findTransferApp(id);
  if (!found) throw new Error(id);
  return found;
};

const render = async (id: string) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SendButton app={app(id)} onPress={() => {}} />,
    );
  });
  return tree.root;
};

const textOf = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Text).map(t => ({
    text: [].concat(t.props.children).join(''),
    color: StyleSheet.flatten(t.props.style)?.color,
  }));

test('아이콘이 있는 앱은 모두 버튼 색이 있고, 흰 배경만 그림자를 두른다', () => {
  for (const a of TRANSFER_APPS) {
    if (!a.icon) {
      expect(a.button).toBeUndefined();
      continue;
    }
    expect(a.button).toBeDefined();
    const { background, text, shadow } = a.button!;
    expect(background).toMatch(/^#[0-9A-F]{6}$/);
    const white = background === '#FFFFFF';
    expect(Boolean(shadow)).toBe(white);
    if (white) {
      expect(text).toBe('dark');
      expect(shadow).toMatch(/^#[0-9A-F]{6}$/);
    }
  }
});

test('글씨 색: 흰·노란 배경은 검정, 진한 배경은 흰색', () => {
  expect(app('toss').button?.text).toBe('dark');
  expect(app('kakaopay').button?.text).toBe('dark');
  expect(app('kb').button?.text).toBe('dark');
  expect(app('kakaobank').button?.text).toBe('dark');
  expect(app('shinhan').button?.text).toBe('light');
  expect(app('nhsmart').button?.text).toBe('light');
  expect(app('hana').button?.text).toBe('light');
  expect(app('kbank').button?.text).toBe('light');
});

test('흰 배경 그림자는 boxShadow로, 못 그리는 기기에선 옅은 테두리로', () => {
  const toss = app('toss').button!;
  expect(sendButtonColors(toss, true).container).toEqual({
    backgroundColor: '#FFFFFF',
    boxShadow:
      '0 2px 8px rgba(0, 92, 252, 0.18), 0 0 0 1px rgba(0, 92, 252, 0.1)',
  });
  expect(sendButtonColors(toss, false).container).toEqual({
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 252, 0.25)',
    padding: 11,
  });
  const shinhan = sendButtonColors(app('shinhan').button!, true);
  expect(shinhan.container).toEqual({ backgroundColor: '#2A96FF' });
  expect(shinhan.title).toBe('#ffffff');
});

test('설명 문구: 자동입력 앱과 복사 후 여는 앱이 다르다', () => {
  expect(sendButtonSubtitle(app('toss'))).toBe(
    '은행·계좌번호가 채워진 송금 화면이 열려요',
  );
  expect(sendButtonSubtitle(app('kb'))).toBe('계좌번호를 복사하고 앱을 열어요');
  expect(sendButtonSubtitle(app('copy'))).toBeUndefined();
});

test('토스: 아이콘·문구·검은 글씨로 그린다', async () => {
  const root = await render('toss');
  expect(root.findAllByType(Image)).toHaveLength(1);
  expect(textOf(root)).toEqual([
    { text: '토스로 송금하기', color: '#191919' },
    { text: '은행·계좌번호가 채워진 송금 화면이 열려요', color: '#333333' },
  ]);
});

test('신한 슈퍼SOL: 진한 배경이라 흰 글씨', async () => {
  const root = await render('shinhan');
  const button = root.findByType(TouchableOpacity);
  expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
    '#2A96FF',
  );
  expect(textOf(root)).toEqual([
    { text: '신한 슈퍼SOL로 송금하기', color: '#ffffff' },
    {
      text: '계좌번호를 복사하고 앱을 열어요',
      color: 'rgba(255, 255, 255, 0.85)',
    },
  ]);
});

test('계좌번호만 복사: 아이콘 없이 기본 파란 버튼', async () => {
  const root = await render('copy');
  expect(root.findAllByType(Image)).toHaveLength(0);
  const button = root.findByType(TouchableOpacity);
  expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
    '#007aff',
  );
  expect(textOf(root).map(t => t.text)).toEqual(['계좌번호 복사하기']);
});

test('아이콘은 왼쪽, 문구는 버튼 가운데 (오른쪽에 아이콘 폭만큼 여백)', async () => {
  const root = await render('woori');
  const icon = StyleSheet.flatten(root.findByType(Image).props.style);
  const texts = root.findByType(Image).parent!
    .children[1] as ReactTestRenderer.ReactTestInstance;
  const style = StyleSheet.flatten(texts.props.style);
  expect(style.alignItems).toBe('center');
  expect(style.marginRight).toBe(icon.width);
  for (const t of texts.findAllByType(Text)) {
    expect(StyleSheet.flatten(t.props.style).textAlign).toBe('center');
  }
});
