import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type RecognizedText = {
  text: string;
  confidence: number;
};

export interface Spec extends TurboModule {
  recognize(imageUri: string): Promise<RecognizedText>;
}

// getEnforcing이 아닌 get: 네이티브 빌드가 아직 없는 환경에서도
// JS는 CLOVA 폴백으로 동작해야 하므로 null 허용.
export default TurboModuleRegistry.get<Spec>('TextRecognition');
