import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): { containerPath: string; suiteName: string };
  setString(key: string, value: string): void;
  getString(key: string): Promise<string | null>;
  remove(key: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AppGroup');
