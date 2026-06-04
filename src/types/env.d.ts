declare module 'react-native-config' {
  interface Env {
    CLOVA_INVOKE_URL: string;
    CLOVA_SECRET_KEY: string;
    ADFIT_IOS_CLIENT_ID: string;
    ADFIT_IOS_RESULT_CLIENT_ID: string;
  }
  const Config: Env;
  export default Config;
}
