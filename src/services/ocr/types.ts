export type ClovaInferResult = 'SUCCESS' | 'FAILURE' | 'ERROR';

export type ClovaField = {
  inferText: string;
  inferConfidence: number;
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>;
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
  candidates?: ParsedAccount[];
};
