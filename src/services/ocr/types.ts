import type { AccountRegions } from './regions';

export type ClovaInferResult = 'SUCCESS' | 'FAILURE' | 'ERROR';

export type ClovaField = {
  inferText: string;
  inferConfidence: number;
  boundingPoly?: {
    // 0인 좌표는 빠질 수 있다
    vertices: Array<{ x?: number; y?: number }>;
  };
};

export type ClovaImage = {
  inferResult: ClovaInferResult;
  message: string;
  fields: ClovaField[];
};

export type ClovaResponse = {
  version: string;
  requestId: string;
  timestamp: number;
  images: ClovaImage[];
};

export type ParsedAccount = {
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  holderName?: string;
  confidence: number;
  /** 은행의 알려진 자릿수·하이픈 그룹과 맞지 않음 — 오인식 의심 */
  formatMismatch?: boolean;
  /** 사진 글자에 은행명이 없어 계좌번호 앞자리로 추정한 은행 */
  bankInferred?: boolean;
  /** 사진에서 은행·계좌번호·예금주를 읽은 자리 (단위는 RecognizeAccountResult.regionUnit) */
  regions?: AccountRegions;
  candidates?: ParsedAccount[];
};
