import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** 패키지명으로 앱 실행. 설치돼 있지 않거나 실행할 수 없으면 false. */
  launch(packageName: string): Promise<boolean>;
}

// Android 전용 모듈. iOS는 URL 스킴(Linking)으로 앱을 열기 때문에 구현이 없다.
export default TurboModuleRegistry.get<Spec>('AppLauncher');
