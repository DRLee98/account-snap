import { locateAccount, normalizeRect } from '../src/services/ocr/regions';
import { parseAccountFromText } from '../src/services/ocr/textParser';
import type { TextBox } from '../src/services/ocr/readingOrder';

const box = (
  text: string,
  x: number,
  y: number,
  width = 60,
  height = 20,
): TextBox => ({ text, confidence: 0.99, x, y, width, height });

// "국민은행 / 홍길동" 아래 줄에 계좌번호가 세 덩어리로 나뉜 사진
const sign = [
  box('국민은행', 20, 10, 80),
  box('/', 105, 10, 10),
  box('홍길동', 120, 10, 60),
  box('110123', 20, 50, 70),
  box('45', 95, 50, 20),
  box('678901', 120, 50, 70),
];

test('계좌번호가 여러 박스로 나뉘어 있어도 묶어서 찾는다', () => {
  const regions = locateAccount(sign, {
    accountNumber: '11012345678901',
    bankCode: '004',
    holderName: '홍길동',
    bankFromText: true,
  });
  expect(regions.number).toEqual({ x: 20, y: 50, width: 170, height: 20 });
  expect(regions.bank).toEqual({ x: 20, y: 10, width: 80, height: 20 });
  expect(regions.holder).toEqual({ x: 120, y: 10, width: 60, height: 20 });
});

test('은행을 계좌번호로 추정했으면 사진에 은행 자리를 표시하지 않는다', () => {
  const regions = locateAccount(sign, {
    accountNumber: '11012345678901',
    bankCode: '004',
    bankFromText: false,
  });
  expect(regions.bank).toBeUndefined();
  expect(regions.number).toBeDefined();
});

test('못 찾은 항목은 비워 둔다', () => {
  const regions = locateAccount(sign, {
    accountNumber: '99998888777766',
    holderName: '김철수',
    bankFromText: false,
  });
  expect(regions).toEqual({});
});

test('읽기 순서가 뒤섞인 박스도 줄 순서대로 맞춰 찾는다', () => {
  const shuffled = [sign[5], sign[3], sign[0], sign[4], sign[2], sign[1]];
  const regions = locateAccount(shuffled, {
    accountNumber: '11012345678901',
    bankFromText: false,
  });
  expect(regions.number).toEqual({ x: 20, y: 50, width: 170, height: 20 });
});

test('픽셀 좌표는 사진 크기 대비 비율로, 비율 좌표는 그대로', () => {
  const rect = { x: 20, y: 50, width: 170, height: 20 };
  expect(normalizeRect(rect, 'px', 200, 100)).toEqual({
    x: 0.1,
    y: 0.5,
    width: 0.85,
    height: 0.2,
  });
  const norm = { x: 0.1, y: 0.2, width: 0.3, height: 0.1 };
  expect(normalizeRect(norm, 'normalized', 200, 100)).toBe(norm);
});

test('파서: 사진에 은행명이 없으면 추정 은행으로 표시한다', () => {
  const inferred = parseAccountFromText(
    '입금 계좌 3333-01-2345678 홍길동',
    0.9,
  );
  expect(inferred?.bankName).toBe('카카오뱅크');
  expect(inferred?.bankInferred).toBe(true);

  const fromText = parseAccountFromText('카카오뱅크 3333-01-2345678', 0.9);
  expect(fromText?.bankInferred).toBe(false);
});
