declare module 'react-native-config' {
  interface Env {
    CLOVA_INVOKE_URL: string;
    CLOVA_SECRET_KEY: string;
    OCR_PROXY_URL?: string;
    OCR_PROXY_TOKEN?: string;
    ADFIT_IOS_CLIENT_ID: string;
    ADFIT_IOS_RESULT_CLIENT_ID: string;
    ADFIT_ANDROID_CLIENT_ID: string;
    ADFIT_ANDROID_RESULT_CLIENT_ID: string;
  }
  const Config: Env;
  export default Config;
}
