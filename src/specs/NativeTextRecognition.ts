import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type RecognizedBlock = {
  text: string;
  confidence: number;
  // 블록 좌표. 단위는 플랫폼마다 다르지만(iOS 정규화, Android 픽셀)
  // 한 결과 안에서만 일관되면 된다 — 읽기 순서 정렬에만 사용.
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RecognizedText = {
  text: string;
  confidence: number;
  blocks: RecognizedBlock[];
};

export interface Spec extends TurboModule {
  recognize(imageUri: string): Promise<RecognizedText>;
}

// getEnforcing이 아닌 get: 네이티브 빌드가 아직 없는 환경에서도
// JS는 CLOVA 폴백으로 동작해야 하므로 null 허용.
export default TurboModuleRegistry.get<Spec>('TextRecognition');
