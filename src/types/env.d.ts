declare module 'react-native-config' {
  interface Env {
    CLOVA_INVOKE_URL: string;
    CLOVA_SECRET_KEY: string;
  }
  const Config: Env;
  export default Config;
}
