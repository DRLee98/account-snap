declare module 'react-native-config' {
  interface Env {
    CLOVA_INVOKE_URL: string;
    CLOVA_SECRET_KEY: string;
    OCR_PROXY_URL?: string;
    OCR_PROXY_TOKEN?: string;
    /** 'true'면 온디바이스 OCR을 건너뛰고 항상 CLOVA 호출 (디버깅용) */
    OCR_FORCE_CLOVA?: string;
    ADFIT_IOS_CLIENT_ID: string;
    ADFIT_IOS_RESULT_CLIENT_ID: string;
  }
  const Config: Env;
  export default Config;
}
